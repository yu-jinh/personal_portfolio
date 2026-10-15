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

// Group titles are under skillsSection.groups.<key>; items are technical names, shown as-is.
// Only tools backed by the résumé or by a write-up on this site belong here.
export const SKILLS = [
  { key: 'robotics', items: ['ROS 2', 'dora-rs', 'Teleoperation', 'Motion control', 'URDF', 'LiveKit / WebRTC'] },
  { key: 'xr', items: ['Unity', 'OpenXR', 'Meta Quest 3', 'Hand tracking', 'Mixed reality', 'Unity shaders', 'Android native plugins'] },
  { key: 'perception', items: ['OpenCV', 'FoundationPose', 'MediaPipe', 'ArUco', 'ONNX / sherpa-onnx', 'Stable Diffusion', 'LoRA fine-tuning', 'Robot policy models'] },
  { key: 'embedded', items: ['ESP32 / ESP-IDF', 'Raspberry Pi', 'I²C peripherals', 'UVC cameras', 'Sensors & motors', 'Onshape CAD', '3D printing'] },
  { key: 'web', items: ['Spring Boot', 'Vue', 'SQL Server', 'Redis', 'Caddy', 'WeChat Mini Program'] },
  { key: 'languages', items: ['C#', 'Python', 'Java', 'C', 'Lua'] },
  { key: 'tools', items: ['Cursor', 'Claude Code'] },
]
