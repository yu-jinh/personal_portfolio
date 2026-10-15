---
title: Visual Novel Generation: Consistent & Multi-Character Diffusion
summary: A technical survey on generating visual-novel art with diffusion models: keeping characters consistent across scenes and placing several characters in one image. I reproduced the methods in ComfyUI and ran my own multi-character experiments.
role: AI Model Engineering Intern. Researched the methods, reproduced them in ComfyUI, ran the multi-character experiments and presented the survey to the team.
brief: How to keep characters consistent across scenes and place several in one image: StoryDiffusion, IP-Adapter and DenseDiffusion, plus my own regional-prompting experiments.
---

## At a glance

- **What:** A survey and hands-on evaluation of methods for story-style image generation, presented to the team in September 2024
- **Why:** Visual novels and illustrated stories need the *same* characters across many scenes, often several in one frame, and that is exactly where standard diffusion models break down
- **Covers:** StoryDiffusion · IP-Adapter · DenseDiffusion · Regional Prompter · StoryTeller text-to-video · ComfyUI reproductions

## The problem

A visual novel is a sequence of illustrated scenes with a recurring cast. Out of the box, a text-to-image model fails in two ways:

1. **Identity drift.** Generate the same character twice and you get two different people: the face, hair and outfit change from scene to scene.
2. **Attribute leakage.** Put two characters in one prompt and their descriptions bleed into each other. Colors swap, outfits merge, and one character often disappears.

The survey looks at both problems separately, then at how to turn consistent images into a narrated video.

## Methods at a glance

| Method | Solves | Extra training |
| --- | --- | --- |
| StoryDiffusion | Consistency across a batch of images | None |
| IP-Adapter | Consistency from a reference image | One-time adapter, no per-character tuning |
| Regional prompting | Several characters in one image | None |
| DenseDiffusion | Several characters, precise layout | None |

## Part 1: Character consistency

### StoryDiffusion

StoryDiffusion splits a story into one prompt per scene and generates all scenes **in a single batch**. Its key idea is **Consistent Self-Attention**: while generating each image, the self-attention layers also attend to tokens sampled from the *other* images in the batch. The scenes share visual features, so the character keeps the same face and clothes throughout the story.

- **Training-free:** it plugs into an existing model with no fine-tuning dataset.
- **Composable:** a reference image can be added through ControlNet, InstantID or IP-Adapter.

### IP-Adapter

IP-Adapter lets a model take an **image as a prompt**, for example a character reference sheet. It does this with *decoupled cross-attention*: the text prompt and the image prompt each get their own key/value projections, and the two attention results are added together. The query $\mathbf{Q}$, computed from the image latent, is shared by both.

**Text prompt**, Stable Diffusion's original cross-attention:

$$
\begin{aligned}
\mathbf{Z}' &= \operatorname{Attention}(\mathbf{Q}, \mathbf{K}, \mathbf{V}) \\
&= \operatorname{Softmax}\!\left(\frac{\mathbf{Q}\mathbf{K}^{\top}}{\sqrt{d}}\right)\mathbf{V}
\end{aligned}
$$

**Image prompt**, a new cross-attention over the encoded reference image:

$$
\begin{aligned}
\mathbf{Z}'' &= \operatorname{Attention}(\mathbf{Q}, \mathbf{K}', \mathbf{V}') \\
&= \operatorname{Softmax}\!\left(\frac{\mathbf{Q}\mathbf{K}'^{\top}}{\sqrt{d}}\right)\mathbf{V}'
\end{aligned}
$$

**Combined**, the image features predicted from both prompts:

$$
\begin{aligned}
\mathbf{Z}^{\text{new}} = {}& \operatorname{Softmax}\!\left(\frac{\mathbf{Q}\mathbf{K}^{\top}}{\sqrt{d}}\right)\mathbf{V} \\
& + \operatorname{Softmax}\!\left(\frac{\mathbf{Q}\mathbf{K}'^{\top}}{\sqrt{d}}\right)\mathbf{V}'
\end{aligned}
$$

The base model stays frozen and only the lightweight adapter is trained once. That makes it a practical way to "lock in" a character's look without training a model per character.

## Part 2: Multi-character generation

### How cross-attention controls layout

The first question is *where* a prompt word ends up in the image. In each cross-attention layer $i$ of the U-Net, the latent pixels attend to the text tokens:

$$
\begin{aligned}
\boldsymbol{h}_{i,t} &= F^{(i)}_t\big(\hat{\boldsymbol{h}}_{i,t}, \boldsymbol{X}\big)\cdot\big(W_v^{(i)}\boldsymbol{X}\big) \\
F^{(i)}_t &= \operatorname{softmax}\!\left(\frac{\big(W_q^{(i)}\hat{\boldsymbol{h}}_{i,t}\big)\big(W_k^{(i)}\boldsymbol{X}\big)^{\top}}{\sqrt{d}}\right)
\end{aligned}
$$

Here $\boldsymbol{X}$ is the text embedding, and the attention scores $F^{(i)}_t$ have shape $\lceil w/c^i \rceil \times \lceil h/c^i \rceil \times l_H \times l_W$: the downsampled image width and height, the number of attention heads and the number of text tokens.

Following **DAAM** (Diffusion Attentive Attribution Maps), the map for word $k$ sums these scores over the down- and up-sampling layers $i$, timesteps $t_j$ and heads $\ell$, after upsampling each low-resolution map to full size with bicubic interpolation (the tilde):

$$
D^{\mathbb{R}}_k[x, y] = \sum_{i,\,j,\,\ell} \tilde{F}^{(i)\downarrow}_{t_j,k,\ell}[x, y] + \tilde{F}^{(i)\uparrow}_{t_j,k,\ell}[x, y]
$$

The result is clear: **attention for a word is high exactly in the region where that word is drawn.** So editing the attention scores means editing the layout. Both methods below build on this.

### Regional prompting

Give the model a mask that splits the canvas into regions, plus one prompt per region. Generation is steered so each region follows its own prompt.

- ✅ Regions don't contaminate each other, and the image still reads as one coherent scene
- ✅ No extra training
- ⚠️ With no fine-tuning, results depend heavily on the quality of the base model
- ⚠️ In experiments it struggled with very fine-grained details, such as the exact shape and texture of leaves

### DenseDiffusion

DenseDiffusion takes the prompt as $(c_n, \vec{m}_n)$ pairs, each region's caption with its mask, and **modulates the attention scores directly** by adding a term $M$ before the softmax, so each phrase concentrates inside its region:

$$
A' = \operatorname{softmax}\!\left(\frac{\mathbf{Q}\mathbf{K}^{\top} + M}{\sqrt{d}}\right)
$$

$$
\begin{aligned}
M = {}& \lambda_t \cdot R \odot M_{\text{pos}} \odot (1 - S) \\
& - \lambda_t \cdot (1 - R) \odot M_{\text{neg}} \odot (1 - S)
\end{aligned}
$$

Where $R = 1$, attention is pushed up; where $R = 0$, it is pushed down. Each term has a specific job:

**Query–key condition map $R$**: which query–key pairs belong together. In cross-attention it brings in the masks: column $j$ is the mask of the region whose caption contains text token $j$, where $\vec{k}[j]$ is that region's index (0 for none):

$$
R^{\text{cross}}_{:j} =
\begin{cases}
\vec{0}, & \text{if } \vec{k}[j] = 0 \\
\vec{m}_{\vec{k}[j]}, & \text{otherwise}
\end{cases}
$$

In self-attention, two pixels may attend to each other only if they share a region. A 1 keeps each region coherent, and a 0 stops features leaking across regions:

$$
R^{\text{self}}_{ij} =
\begin{cases}
1, & \text{if } \exists\, n : \vec{m}_n[i] = \vec{m}_n[j] = 1 \\
0, & \text{otherwise}
\end{cases}
$$

**Value-range adaptive modulation $M_{\text{pos}}, M_{\text{neg}}$**: scale each push by how far the score can move without leaving the model's normal range, which protects image quality:

$$
\begin{aligned}
M_{\text{pos}} &= \max\!\big(\mathbf{Q}\mathbf{K}^{\top}\big) - \mathbf{Q}\mathbf{K}^{\top} \\
M_{\text{neg}} &= \mathbf{Q}\mathbf{K}^{\top} - \min\!\big(\mathbf{Q}\mathbf{K}^{\top}\big)
\end{aligned}
$$

**Modulation scalar $\lambda_t$**: strong edits early in denoising, gentle ones as $t \to 0$, where large changes would break the image. Self- and cross-attention use different weights $w$:

$$
\lambda_t = w \cdot t^{\,p}
$$

**Mask-area adaptive term $S$**: the area ratio of each region, which reduces the effect of mask size so small regions aren't overpowered by large ones.

## Experiments: multi-character generation

I ran these with the **Regional Prompter** extension for Stable Diffusion WebUI, an anime-style SDXL model and character LoRAs. Prompts for each region are separated with `BREAK`. Each figure shows the region layout I used on the left and the generated image on the right.

### 1. Simple split: two characters

<figure class="experiment">
<div class="experiment-pair">
<div class="experiment-panel"><span>Region layout</span><img src="./images/projects/multi-character/layout-two.svg" alt="Canvas split into two vertical halves, one per character" loading="lazy"></div>
<div class="experiment-panel"><span>Output</span><img src="./images/projects/multi-character/two-characters.jpg" alt="Two anime characters standing side by side; one in a black hoodie waving, one in a white hoodie with a hand on her hip" loading="lazy"></div>
</div>
<figcaption>Each half gets its own character and outfit. The black and white hoodies stay with the right character, with no attribute leakage.</figcaption>
</figure>

```prompt
score_9, score_8_up, score_7_up, source_anime, indoors, standing,
cowboy shot, 2girls, hoodie, jeans, looking at viewer,
BREAK yae miko, black hoodie, waving,
BREAK raiden shogun, white hoodie, hand on hip
```

### 2. Split + LoRA: adding a third character

<figure class="experiment">
<div class="experiment-pair">
<div class="experiment-panel"><span>Region layout</span><img src="./images/projects/multi-character/layout-three.svg" alt="Canvas split into three vertical columns, the third driven by a LoRA" loading="lazy"></div>
<div class="experiment-panel"><span>Output</span><img src="./images/projects/multi-character/three-characters-lora.jpg" alt="Three anime characters posing together, the third reaching towards the viewer" loading="lazy"></div>
</div>
<figcaption>A character the base model doesn't know is added through a LoRA, applied only in its own region, next to two characters the model already knows.</figcaption>
</figure>

```prompt
score_9, score_8_up, score_7_up, source_anime, indoors, standing,
cowboy shot, 3girls, from above, looking at viewer,
BREAK yae miko, black hoodie, hoodie, jeans,
BREAK raiden shogun, white hoodie, hoodie, jeans,
BREAK reaching towards viewer, <lora:shirakami_fubuki_sdxl:1>, fubukibase, ...
```

### 3. Custom regions: characters, a creature and the background

<figure class="experiment">
<div class="experiment-pair">
<div class="experiment-panel"><span>Region layout</span><img src="./images/projects/multi-character/layout-custom.svg" alt="Hand-drawn regions: a tall region for a girl, an oval for Pikachu in front of her, a bird in the top right, and the background" loading="lazy"></div>
<div class="experiment-panel"><span>Output</span><img src="./images/projects/multi-character/custom-regions.jpg" alt="A girl under cherry blossoms holding Pikachu, with a bird flying in the top-right corner" loading="lazy"></div>
</div>
<figcaption>Free-form, hand-drawn regions place each subject where it was drawn: the girl, the Pikachu she is holding, a bird in the corner, and a cherry-blossom background.</figcaption>
</figure>

```prompt
score_9, score_8_up, score_7_up, source_anime,
BREAK cherry blossom,
BREAK 1girl, red eyes, black hair, white shirt, long hair,
      holding creature, holding pikachu,
BREAK pikachu, pokemon (species), smile, open mouth,
BREAK bird, flying bird
```

## Part 3: From images to a narrated video

To turn consistent images into a story video, I set up **StoryTeller**, an open-source pipeline that chains three generative models:

```
first sentence ─▶ GPT-2 (optional) ─▶ N story sentences
                                         │
                   ┌─────────────────────┴───────────────┐
                   ▼                                     ▼
      Stable Diffusion v1.5                       Glow-TTS
      one illustration per sentence               spoken narration
                   └──────────────┬──────────────────────┘
                                  ▼
                       ffmpeg ─▶ narrated video
```

This is the skeleton the consistency and multi-character methods above plug into: better image generation in the middle gives a better story at the end.

## Reproductions in ComfyUI

To compare methods side by side, I rebuilt them as **ComfyUI** workflows:

- **Character consistency:** StoryDiffusion, IP-Adapter
- **Multi-character generation:** DenseDiffusion

ComfyUI's node graphs made it easy to swap base models, LoRAs and conditioning, and to show the team live, reproducible comparisons.

## Takeaways

- **Consistency and multi-character layout are separate problems**, and the best tools for each are different. A production pipeline needs both.
- **Attention is the control surface.** StoryDiffusion, IP-Adapter and DenseDiffusion all work by changing what the attention layers see, not by retraining the model.
- **Training-free methods are only as good as the base model**, so model choice and character LoRAs still matter.

## References

- Zhou et al. *StoryDiffusion: Consistent Self-Attention for Long-Range Image and Video Generation.* [arXiv:2405.01434](https://arxiv.org/abs/2405.01434)
- Ye et al. *IP-Adapter: Text Compatible Image Prompt Adapter for Text-to-Image Diffusion Models.* [arXiv:2308.06721](https://arxiv.org/abs/2308.06721)
- Kim et al. *Dense Text-to-Image Generation with Attention Modulation (DenseDiffusion).* ICCV 2023. [arXiv:2308.12964](https://arxiv.org/abs/2308.12964)
- Tang et al. *What the DAAM: Interpreting Stable Diffusion Using Cross Attention.* [arXiv:2210.04885](https://arxiv.org/abs/2210.04885)
- [Regional Prompter](https://github.com/hako-mikan/sd-webui-regional-prompter) for Stable Diffusion WebUI
- [StoryTeller](https://github.com/jaketae/storyteller): multimodal AI story teller
