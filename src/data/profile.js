// Language-neutral profile data. All display text lives in src/locales/*.json.

export const PROFILE = {
  email: 'yjh849625800@gmail.com',
  linkedin: 'https://www.linkedin.com/in/yjh849625800',
  github: '', // optional: full GitHub profile URL; empty hides the link
  resume: './jinhong_resume.pdf', // file in public/
  photo: '', // optional: e.g. './images/avatar.jpg' in public/; empty shows the "JY" monogram
}

// Newest first. `start`/`end` are YYYY.MM; `end: null` means present.
// Text for each entry is under experienceSection.items.<key> in the locale files.
export const EXPERIENCE = [
  { key: 'swiftshop', start: '2026.08', end: null, projects: [] },
  {
    key: 'theta',
    start: '2024.09',
    end: '2026.07',
    projects: ['vr-teleoperation', 'digital-twin', 'umi-data-collection', 'ego-data-collection', 'claw-voice-agent'],
  },
  { key: 'cardinal', start: '2024.05', end: '2024.10', projects: ['multi-character-diffusion'] },
  { key: 'neu', start: '2023.06', end: '2023.12', projects: [] },
]

// Group titles are under skillsSection.groups.<key>; items are proper nouns, shown as-is.
export const SKILLS = [
  { key: 'robotics', items: ['ROS 2', 'dora-rs', 'Teleoperation', 'Robot Data Collection', 'Motion Control'] },
  { key: 'xr', items: ['Unity', 'OpenXR', 'Meta Quest', 'Mixed Reality', 'Android Native Plugins'] },
  { key: 'ai', items: ['Robot Policy Models', 'Diffusion Models', 'LoRA Fine-tuning', 'NLP', 'ONNX', 'sherpa-onnx'] },
  { key: 'embedded', items: ['ESP32 / ESP-IDF', 'Raspberry Pi', 'Sensors & Motors', '3D Modeling', '3D Printing'] },
  { key: 'web', items: ['Spring Boot', 'Vue', 'SQL Server', 'Redis', 'Caddy', 'WeChat Mini Program'] },
  { key: 'tools', items: ['Cursor', 'Claude Code', 'Agent Skills'] },
]
