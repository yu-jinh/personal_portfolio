# Personal Portfolio（个人作品集网站）

Vite + React + react-i18next + react-router。首页（Hero / 项目 / 工作经历 / 技能 / 教育 / 联系）+ 每个项目一篇独立详情页；中英一键切换，浅色 / 深色主题（默认跟随系统）。

## 本地运行

```bash
npm install
npm run dev     # 浏览器打开 http://localhost:5173
npm run build   # 产物在 dist/（部署时才需要）
```

`vite.config.js` 的 `base: './'` + HashRouter（URL 形如 `#/projects/umi-data-collection`），`dist/` 放到任何 GitHub Pages 地址下都能直接用，无需额外配置。

## 改内容去哪里

| 想改什么 | 文件 |
| --- | --- |
| 邮箱、LinkedIn、GitHub、头像、简历路径 | `src/data/profile.js` → `PROFILE` |
| 工作经历的时间与关联项目 | `src/data/profile.js` → `EXPERIENCE`（文案在 `src/locales/*.json` → `experienceSection.items`） |
| 技能分组与条目 | `src/data/profile.js` → `SKILLS` |
| 首页所有文案（中英各一份） | `src/locales/en.json`、`src/locales/zh.json` |
| 项目列表、顺序、分类、技术栈、封面图、演示视频 | `src/data/projects.js` |
| 项目详情页正文 | `src/content/projects/<slug>.en.md` 和 `<slug>.zh.md` |

### 新增一个项目

1. 在 `src/data/projects.js` 的 `PROJECTS` 里加一项（`slug` 唯一，`category` 取 `interaction` / `data` / `ai` / `web`）。
   `kind` 决定放在首页哪个板块：`work`（工作中做的项目 → "项目"板块，带分类筛选）；`survey`（技术调研）或 `note`（学习笔记）→ "调研与笔记"板块，按文章卡片展示（类型、日期、阅读时长），建议按时间从新到旧排列。
2. 新建 `src/content/projects/<slug>.en.md` 和 `<slug>.zh.md`，开头写 frontmatter：

   ```markdown
   ---
   title: 项目标题
   summary: 一句话介绍（也显示在首页卡片上）
   role: 我的职责
   ---

   ## 正文用 Markdown 写
   ```

   数学公式用 LaTeX：行内 `$...$`，独立公式用单独成行的 `$$ ... $$`（构建时由 KaTeX 渲染，公式写错会直接构建失败；正文里的美元符号写成 `\$`）。长公式用 `\begin{aligned} ... \\ ... \end{aligned}` 换行，手机上更好看。

   正文里嵌入演示短片用 `<video data-src="./images/projects/xxx/clip.mp4" muted loop playsinline preload="none"></video>`（放在 `<figure class="figure-media">` 里）：滚动到可见时才下载并自动循环播放，离开视野自动暂停。短片请先转成无声 MP4（约 960 宽），并对画面中的人脸打码。

   只写一种语言也可以：缺少的语言会自动显示另一种（例如 `multi-character-diffusion` 只有英文版，中文站也显示英文）。

3. 图片 / 视频放 `public/images/`、`public/videos/`，在 Markdown 里用 `./images/xxx.jpg` 引用；在 `projects.js` 里设 `cover`（封面图）和 `video`（YouTube / Bilibili 嵌入链接，或 `./videos/xxx.mp4`）。不设时自动生成分类配色封面。

## 待补清单

正文里的 `<!-- TODO: ... -->` 是 HTML 注释，**不会显示在网站上**，是给你补充素材的提示：

- `public/jinhong_resume.pdf`：简历 PDF（更新时用同名文件替换即可）
- 每个项目的演示视频、照片、可公开的数据（延迟、采集时长、数据规模等）
- `claw-voice-agent`：说明哪些是开源项目、哪些是你开发 / 移植的
- `swiftshop`：确认技术栈与实际一致
- `PROFILE.photo`（可选）：职业照，替换 "JY" 字母头像
- `PROFILE.github`（可选）：填上后自动显示 GitHub 链接

## 部署

推送到 `main` 后，GitHub Actions（`.github/workflows/deploy.yml`）会在云端构建 `dist/` 并发布到 GitHub Pages。`dist/` 永远不提交到仓库。

仓库只包含构建所需的文件；设计笔记（`GLOSSARY.md`、`docs/`）和 AI 工具配置（`AGENTS.md`、`.agents/`、`.claude/`）只保留在本地，见 `.gitignore`。
