# Personal Portfolio（个人作品集网站）

Vite + React + react-i18next，深色单页滚动站：导航 / Hero / 项目 / 技能 / 联系 + 右上角中英一键切换。

## 本地运行

```bash
npm install
npm run dev     # 浏览器打开提示的 http://localhost:5173
npm run build   # 产物在 dist/（部署时才需要）
```

`vite.config.js` 里 `base: './'` 用的是相对路径，所以 `dist/` 放到任何 GitHub Pages URL 下都能用（`username.github.io` 或 `username.github.io/<repo>/` 都行），部署时不需要改配置。

## 待填清单（所有 `TODO:` 占位）

中英文案各一份，改的时候两边一起改：

| 位置 | 内容 |
| --- | --- |
| `src/locales/zh.json` + `en.json` → `hero.*` | 姓名、拼音、求职意向一句话、学校专业毕业时间、邮箱、GitHub、LinkedIn |
| `src/locales/*.json` → `projects.umi/ego/teleop/coglet` | 每个项目的一句话、你的分工、详细介绍、演示视频链接 |
| `src/components/Skills.jsx` → `GROUPS` | 技能分组与条目（按实际背景改） |
| `index.html` | `<title>` 和 meta description |
| `public/resume.pdf` | 把简历 PDF 放这里，Hero 的"下载简历"按钮即生效 |

## 项目分组（Q13 定稿）

- **数据采集**：UMI 数据采集、EGO 数采
- **交互控制**：遥操（OpenXR/Unity/Quest）、智能桌宠（ESP32/ESP-CLAW）

## 术语与决策

- `GLOSSARY.md`：遥操 / 数据采集 / UMI / EGO / 交互控制 / 具身智能的中英定义
- `docs/adr/0001-vite-react-i18next.md`：为什么选 Vite + React + react-i18next
- `docs/agents/*.md`：mattpocock skills 的 issue tracker / triage labels / domain 配置
