// Project registry. Array order = display order on the home page and prev/next order on project pages.
//
// Each project's write-up lives in src/content/projects/<slug>.<en|zh>.md
// (frontmatter: title, summary, role; body: Markdown).
//
// cover: image in public/, e.g. './images/umi-cover.jpg'; empty → generated cover art
// video: YouTube/Bilibili embed URL, or a file in public/ such as './videos/umi.mp4'; empty → no video block
// label: short text printed on the generated cover
// kind: 'work' (built in a job, listed under Projects) or 'survey' / 'note'
//       (surveys and study notes, listed under Research & Notes, newest first)

export const CATEGORIES = ['interaction', 'data', 'ai', 'web']
export const RESEARCH_KINDS = ['survey', 'note']

export const PROJECTS = [
  {
    slug: 'vr-teleoperation',
    kind: 'work',
    category: 'interaction',
    label: 'TELEOP',
    org: 'Theta-intelligence',
    start: '2024',
    end: '2026',
    stack: ['Meta Quest 3', 'Unity', 'OpenXR', 'LiveKit', 'WebRTC', 'xArm 7', 'Mixed Reality'],
    cover: './images/projects/vr-teleop/cover.jpg',
    video: '',
  },
  {
    slug: 'digital-twin',
    kind: 'work',
    category: 'interaction',
    label: 'TWIN',
    org: 'Theta-intelligence',
    start: '2024',
    end: '2026',
    stack: ['Meta Quest 3', 'Unity Shaders', 'ZED 2i', 'Point Clouds', 'URDF', 'FoundationPose', 'OpenCV', 'LiveKit'],
    cover: './images/projects/digital-twin/cover.jpg',
    video: '',
  },
  {
    slug: 'umi-data-collection',
    kind: 'work',
    category: 'data',
    label: 'UMI',
    org: 'Theta-intelligence',
    start: '2024',
    end: '2026',
    stack: ['Raspberry Pi 4', 'UVC Cameras', 'Meta Quest 3', 'BLE', 'ArUco', 'H.264 Encoding', 'Onshape'],
    cover: './images/projects/umi/cover.jpg',
    video: './images/projects/umi/demo.mp4',
  },
  {
    slug: 'ego-data-collection',
    kind: 'work',
    category: 'data',
    label: 'EGO',
    org: 'Theta-intelligence',
    start: '2024',
    end: '2026',
    stack: ['Meta Quest 3', 'Stereo UVC Camera', 'OpenXR Hand Tracking', 'MediaPipe', 'MuJoCo', 'Gesture Recognition'],
    cover: './images/projects/ego/cover.jpg',
    video: '',
  },
  {
    slug: 'claw-voice-agent',
    kind: 'work',
    category: 'interaction',
    label: 'COGLET',
    org: 'Theta-intelligence',
    start: '2026.04',
    end: '2026.04',
    stack: ['ESP32-S3', 'ESP-Claw', 'PCA9685', 'I²C', 'Lua', 'Grove Vision AI V2', 'LLM Tool Calling'],
    cover: './images/projects/coglet/cover.jpg',
    video: '',
  },
  {
    // English-only write-up: the Chinese site falls back to the .en.md file.
    slug: 'multi-character-diffusion',
    kind: 'survey',
    category: 'ai',
    label: 'MULTI-CHARACTER',
    org: 'Cardinal Operations',
    start: '2024.09',
    end: '2024.09',
    stack: ['StoryDiffusion', 'IP-Adapter', 'DenseDiffusion', 'Regional Prompter', 'ComfyUI', 'Stable Diffusion'],
    cover: '',
    video: '',
  },
  {
    // English-only write-up; independent study, so no org (the page hides the Company row).
    slug: 'ddpm-derivation',
    kind: 'note',
    category: 'ai',
    label: 'DDPM',
    org: '',
    start: '2023.04',
    end: '2023.04',
    stack: ['DDPM', 'Probabilistic Modeling', 'Variational Inference', 'PyTorch', 'Fashion-MNIST'],
    cover: '',
    video: '',
  },
]

export const getProject = (slug) => PROJECTS.find((p) => p.slug === slug)

export const isResearch = (project) => project.kind !== 'work'
export const WORK = PROJECTS.filter((p) => !isResearch(p))
export const RESEARCH = PROJECTS.filter(isResearch)

// Prev/next on a project page stays inside the project's own list.
export const siblingsOf = (project) => (isResearch(project) ? RESEARCH : WORK)
