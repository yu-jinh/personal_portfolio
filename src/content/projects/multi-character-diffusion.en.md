---
title: Visual Novel Generation: Consistent & Multi-Character Diffusion
summary: A survey of diffusion methods that keep visual-novel characters consistent across scenes and place several of them in one image, with ComfyUI reproductions and my own experiments.
role: AI Model Engineering Intern. I researched the methods, reproduced them in ComfyUI, ran the multi-character experiments and presented the survey to the team.
brief: How to keep characters consistent across scenes and fit several of them into one image, covering StoryDiffusion, IP-Adapter and DenseDiffusion, plus my own regional-prompting experiments.
---

## Summary

The survey matches diffusion methods to the two ways story-style image generation fails. I rebuilt StoryDiffusion, IP-Adapter and DenseDiffusion as ComfyUI workflows, which let the team compare them live with swappable base models and LoRAs. I also ran three regional-prompting experiments with an anime-style SDXL model.

A visual novel needs the same cast across many scenes, often several characters per frame. Standard text-to-image models show identity drift: face, hair and outfit change between scenes. With two characters in one prompt, they show attribute leakage: colors swap, outfits merge and one character often disappears.

Every surveyed method changes what the attention layers see and leaves the base model untouched. StoryDiffusion and IP-Adapter hold identity by sharing features across images or injecting a reference image. Regional prompting and DenseDiffusion confine each phrase's attention to its own region.

In my experiments, each hoodie color stayed with its intended character. A region-limited LoRA added a character the base model did not know, and hand-drawn regions put each subject where it was drawn.

Consistency and layout are separate problems, so a production pipeline needs tools for both. Training-free methods are only as good as the base model, so model choice and character LoRAs still matter.

## Methods at a glance

| Method | Addresses | Extra training |
| --- | --- | --- |
| StoryDiffusion | Consistency across a batch of images | None |
| IP-Adapter | Consistency from a reference image | One-time adapter, no per-character tuning |
| Regional prompting | Several characters in one image | None |
| DenseDiffusion | Several characters, precise layout | None |

## Character consistency

### StoryDiffusion

StoryDiffusion splits a story into one prompt per scene and generates all scenes **in a single batch**. Its key idea is **Consistent Self-Attention**. While generating each image, the self-attention layers also attend to tokens sampled from the *other* images in the batch. Because the scenes share visual features, the character keeps the same face and clothes throughout the story.

The method is training-free and plugs into an existing model without fine-tuning data. A reference image can also be supplied through ControlNet, InstantID or IP-Adapter.

### IP-Adapter

IP-Adapter lets a model take an **image as a prompt**, such as a character reference sheet. It uses *decoupled cross-attention*: the text prompt and the image prompt each get their own key/value projections. The two attention outputs are then added together. Both branches share the query $\mathbf{Q}$, which is computed from the image latent.

The text branch is Stable Diffusion's original cross-attention:

$$
\begin{aligned}
\mathbf{Z}' &= \operatorname{Attention}(\mathbf{Q}, \mathbf{K}, \mathbf{V}) \\
&= \operatorname{Softmax}\!\left(\frac{\mathbf{Q}\mathbf{K}^{\top}}{\sqrt{d}}\right)\mathbf{V}
\end{aligned}
$$

The image branch is a new cross-attention over the encoded reference image:

$$
\begin{aligned}
\mathbf{Z}'' &= \operatorname{Attention}(\mathbf{Q}, \mathbf{K}', \mathbf{V}') \\
&= \operatorname{Softmax}\!\left(\frac{\mathbf{Q}\mathbf{K}'^{\top}}{\sqrt{d}}\right)\mathbf{V}'
\end{aligned}
$$

Their sum gives the new image features, conditioned on both prompts:

$$
\begin{aligned}
\mathbf{Z}^{\text{new}} = {}& \operatorname{Softmax}\!\left(\frac{\mathbf{Q}\mathbf{K}^{\top}}{\sqrt{d}}\right)\mathbf{V} \\
& + \operatorname{Softmax}\!\left(\frac{\mathbf{Q}\mathbf{K}'^{\top}}{\sqrt{d}}\right)\mathbf{V}'
\end{aligned}
$$

The base model stays frozen, and only the lightweight adapter is trained, once. IP-Adapter can therefore "lock in" a character's look without a separate model for each character.

## Multi-character generation

### How attention sets layout

The first question is *where* in the image each prompt word ends up. In each cross-attention layer $i$ of the U-Net, the latent pixels attend to the text tokens:

$$
\begin{aligned}
\boldsymbol{h}_{i,t} &= F^{(i)}_t\big(\hat{\boldsymbol{h}}_{i,t}, \boldsymbol{X}\big)\cdot\big(W_v^{(i)}\boldsymbol{X}\big) \\
F^{(i)}_t &= \operatorname{softmax}\!\left(\frac{\big(W_q^{(i)}\hat{\boldsymbol{h}}_{i,t}\big)\big(W_k^{(i)}\boldsymbol{X}\big)^{\top}}{\sqrt{d}}\right)
\end{aligned}
$$

Here $\boldsymbol{X}$ is the text embedding. The attention scores $F^{(i)}_t$ have shape $\lceil w/c^i \rceil \times \lceil h/c^i \rceil \times l_H \times l_W$. These are the downsampled image width and height, the number of attention heads and the number of text tokens.

**DAAM** (Diffusion Attentive Attribution Maps) turns these scores into one attribution map per word. Each low-resolution map is first upsampled to full size with bicubic interpolation, denoted by the tilde. The map for word $k$ then sums the scores over the downsampling and upsampling layers $i$, timesteps $t_j$ and heads $\ell$:

$$
D^{\mathbb{R}}_k[x, y] = \sum_{i,\,j,\,\ell} \tilde{F}^{(i)\downarrow}_{t_j,k,\ell}[x, y] + \tilde{F}^{(i)\uparrow}_{t_j,k,\ell}[x, y]
$$

These maps show that **a word's attention is high exactly where that word is drawn.** Editing the attention scores therefore edits the layout. Both methods below build on this.

### Regional prompting

Regional prompting takes a mask that splits the canvas into regions, plus one prompt per region. It then steers generation so that each region follows its own prompt.

Regions stay free of each other's attributes, yet the image still reads as one coherent scene. The method needs no extra training. Because nothing is fine-tuned, results depend heavily on the quality of the base model. In experiments, it struggled with very fine details, such as the exact shape and texture of leaves.

### DenseDiffusion

DenseDiffusion takes the prompt as $(c_n, \vec{m}_n)$ pairs, each pairing a region's caption with its mask. It then **modulates the attention scores directly**. A term $M$ added before the softmax concentrates each phrase's attention inside its region:

$$
A' = \operatorname{softmax}\!\left(\frac{\mathbf{Q}\mathbf{K}^{\top} + M}{\sqrt{d}}\right)
$$

$$
\begin{aligned}
M = {}& \lambda_t \cdot R \odot M_{\text{pos}} \odot (1 - S) \\
& - \lambda_t \cdot (1 - R) \odot M_{\text{neg}} \odot (1 - S)
\end{aligned}
$$

Where $R = 1$, attention is pushed up. Where $R = 0$, it is pushed down. The other factors control how strong each push is.

<details>
<summary>What each factor does</summary>

The query–key condition map $R$ marks which query–key pairs belong together. In cross-attention, it encodes the masks. Column $j$ is the mask of the region whose caption contains text token $j$. Its index $\vec{k}[j]$ names that region (0 if the token belongs to no region):

$$
R^{\text{cross}}_{:j} =
\begin{cases}
\vec{0}, & \text{if } \vec{k}[j] = 0 \\
\vec{m}_{\vec{k}[j]}, & \text{otherwise}
\end{cases}
$$

In self-attention, two pixels may attend to each other only if they belong to the same region. A 1 keeps each region coherent, and a 0 stops features from leaking across regions:

$$
R^{\text{self}}_{ij} =
\begin{cases}
1, & \text{if } \exists\, n : \vec{m}_n[i] = \vec{m}_n[j] = 1 \\
0, & \text{otherwise}
\end{cases}
$$

The value-range adaptive modulation $M_{\text{pos}}, M_{\text{neg}}$ scales each push by how far the score can move. Scores stay within the model's normal range, which protects image quality:

$$
\begin{aligned}
M_{\text{pos}} &= \max\!\big(\mathbf{Q}\mathbf{K}^{\top}\big) - \mathbf{Q}\mathbf{K}^{\top} \\
M_{\text{neg}} &= \mathbf{Q}\mathbf{K}^{\top} - \min\!\big(\mathbf{Q}\mathbf{K}^{\top}\big)
\end{aligned}
$$

The modulation scalar $\lambda_t$ makes strong edits early in denoising and gentle ones as $t \to 0$, when large changes would break the image. Self- and cross-attention use different weights $w$:

$$
\lambda_t = w \cdot t^{\,p}
$$

The mask-area adaptive term $S$ is the area ratio of each region. It reduces the effect of mask size, so small regions aren't overpowered by large ones.

</details>

## Regional-prompting experiments

All three experiments use the **Regional Prompter** extension for Stable Diffusion WebUI, with character LoRAs. `BREAK` separates the per-region prompts.

### Two characters, simple split

<figure class="experiment">
<div class="experiment-pair">
<div class="experiment-panel"><span>Region layout</span><img src="./images/projects/multi-character/layout-two.svg" alt="Canvas split into two vertical halves, one per character" loading="lazy"></div>
<div class="experiment-panel"><span>Output</span><img src="./images/projects/multi-character/two-characters.jpg" alt="Two anime characters standing side by side: one waving in a black hoodie, the other in a white hoodie with a hand on her hip" loading="lazy"></div>
</div>
<figcaption>Each hoodie color stays with its intended character, with no attribute leakage. Left: one region per character. Right: the generated image.</figcaption>
</figure>

<details>
<summary>Prompt</summary>

```prompt
score_9, score_8_up, score_7_up, source_anime, indoors, standing,
cowboy shot, 2girls, hoodie, jeans, looking at viewer,
BREAK yae miko, black hoodie, waving,
BREAK raiden shogun, white hoodie, hand on hip
```

</details>

### A third character via LoRA

<figure class="experiment">
<div class="experiment-pair">
<div class="experiment-panel"><span>Region layout</span><img src="./images/projects/multi-character/layout-three.svg" alt="Canvas split into three vertical columns, the third driven by a LoRA" loading="lazy"></div>
<div class="experiment-panel"><span>Output</span><img src="./images/projects/multi-character/three-characters-lora.jpg" alt="Three anime characters posing together, the third reaching towards the viewer" loading="lazy"></div>
</div>
<figcaption>A LoRA applied only to its own region adds a character the base model doesn't know. It stands beside two characters the model already knows.</figcaption>
</figure>

<details>
<summary>Prompt</summary>

```prompt
score_9, score_8_up, score_7_up, source_anime, indoors, standing,
cowboy shot, 3girls, from above, looking at viewer,
BREAK yae miko, black hoodie, hoodie, jeans,
BREAK raiden shogun, white hoodie, hoodie, jeans,
BREAK reaching towards viewer, <lora:shirakami_fubuki_sdxl:1>, fubukibase, ...
```

</details>

### Free-form custom regions

<figure class="experiment">
<div class="experiment-pair">
<div class="experiment-panel"><span>Region layout</span><img src="./images/projects/multi-character/layout-custom.svg" alt="Hand-drawn regions: a tall region for a girl, an oval for Pikachu in front of her, a region for a bird in the top right, and the background" loading="lazy"></div>
<div class="experiment-panel"><span>Output</span><img src="./images/projects/multi-character/custom-regions.jpg" alt="A girl under cherry blossoms holding Pikachu, with a bird flying in the top-right corner" loading="lazy"></div>
</div>
<figcaption>Free-form, hand-drawn regions put each subject exactly where its region was drawn. The girl holds Pikachu under cherry blossoms, with the bird in the top-right corner.</figcaption>
</figure>

<details>
<summary>Prompt</summary>

```prompt
score_9, score_8_up, score_7_up, source_anime,
BREAK cherry blossom,
BREAK 1girl, red eyes, black hair, white shirt, long hair,
      holding creature, holding pikachu,
BREAK pikachu, pokemon (species), smile, open mouth,
BREAK bird, flying bird
```

</details>

## Narrated video pipeline

**StoryTeller**, an open-source pipeline that I set up, turns consistent images into a story video. It chains three generative models:

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

The consistency and multi-character methods above plug into the image stage in the middle.

## References

- Zhou et al. *StoryDiffusion: Consistent Self-Attention for Long-Range Image and Video Generation.* [arXiv:2405.01434](https://arxiv.org/abs/2405.01434)
- Ye et al. *IP-Adapter: Text Compatible Image Prompt Adapter for Text-to-Image Diffusion Models.* [arXiv:2308.06721](https://arxiv.org/abs/2308.06721)
- Kim et al. *Dense Text-to-Image Generation with Attention Modulation (DenseDiffusion).* ICCV 2023. [arXiv:2308.12964](https://arxiv.org/abs/2308.12964)
- Tang et al. *What the DAAM: Interpreting Stable Diffusion Using Cross Attention.* [arXiv:2210.04885](https://arxiv.org/abs/2210.04885)
- [Regional Prompter](https://github.com/hako-mikan/sd-webui-regional-prompter) for Stable Diffusion WebUI
- [StoryTeller](https://github.com/jaketae/storyteller): multimodal AI storyteller
