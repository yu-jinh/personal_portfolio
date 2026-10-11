import { useTranslation } from 'react-i18next'

// TODO: 按实际背景调整分组与条目（中英两版都要改，见 src/locales/*.json，这里只改 key 顺序不管文案）
const GROUPS = [
  { key: 'robotics', items: ['ROS / ROS 2', 'OpenXR', 'Unity', 'SLAM', 'Motion Mapping'] },
  { key: 'embedded', items: ['ESP32', 'Raspberry Pi', 'USB Cameras', 'Sensor Calibration'] },
  { key: 'software', items: ['Python', 'C++', 'React', 'Git'] },
]

export default function Skills() {
  const { t } = useTranslation()
  return (
    <section id="skills" className="section">
      <h2>{t('skillsSection.title')}</h2>
      <p className="section-subtitle">{t('skillsSection.subtitle')}</p>
      <div className="skill-groups">
        {GROUPS.map((g) => (
          <div className="skill-group" key={g.key}>
            <h3>{t(`skillsSection.groups.${g.key}`)}</h3>
            <div className="tags">
              {g.items.map((item) => <span className="tag" key={item}>{item}</span>)}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
