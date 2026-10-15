---
title: 基于 Meta Quest 3 的 EGO 数据采集
summary: 无需任何手持设备的第一视角数据采集方案：挂在颈部的 Meta Quest 3 同时录制双目相机、双手骨架与掌心轨迹，由双手手势驱动与 UMI 设备相同的采集状态机。
role: 负责整套方案的设计与实现：Quest 应用（UVC 相机采集、手部追踪导出、手势识别与采集状态机）、在仿真和真机上的信号验证，以及录制链路。
---

## 速览

- **是什么**：以第一人称视角录制人用双手完成任务的过程：双目视频，加上双手的三维运动
- **为什么**：人的第一视角数据比机器人数据更容易规模化：任何人、在任何地方都能录制，也不需要手持夹爪
- **亮点**：Quest 3 挂在颈部 · 头显直接采集双目 UVC 相机 · OpenXR 手部关节转换为 MediaPipe 21 关键点格式 · 用掌心位姿代替手腕位姿 · 双手手势指令 · 与 UMI 共用状态机与上传链路

## 从 UMI 到 EGO

EGO 由我的 [UMI 数据采集](#/projects/umi-data-collection)系统演化而来。在 UMI 中，每条演示由三台设备同时录制：**Meta Quest 3** 追踪头部和两只手柄，两只**手持夹爪**各自用树莓派 4 录制腕部相机。**头显上的状态机**统一调度整个流程，夹爪上的按键通过 BLE 发给它，每条演示结束后所有设备通过 **Wi-Fi** 上传。

EGO 保留了这套骨架，去掉了所有需要手握的硬件：

| | UMI 数据采集 | EGO 数据采集 |
| --- | --- | --- |
| 双手 | 手持夹爪 | 徒手，由 Quest 追踪 |
| 位姿信号 | 安装在夹爪上的 Quest 手柄 | 手部追踪得到的掌心位姿 |
| 手部状态 | ArUco 标记得到的夹爪状态 | 手部骨架，每只手 21 个关键点 |
| 相机 | 每只夹爪两路腕部相机 + 头部双目相机 | 头显上的双目相机 |
| 指令 | 薄膜键盘 → 树莓派 → BLE | 双手手势指令 |
| 计算 | Quest + 每只夹爪一台树莓派 | 只有 Quest |
| 采集逻辑 | Quest 上的状态机 | **同一个**状态机 |

头显**挂在颈部**而不是戴在眼前：双目相机从胸口高度俯视双手和桌面，操作员的视线不受遮挡，Quest 依然能追踪双手。

<figure class="figure-media">
<a href="./images/projects/ego/architecture.svg" target="_blank" rel="noreferrer"><img src="./images/projects/ego/architecture.svg" alt="EGO 系统框图：在 Meta Quest 3 上，双目 UVC 相机接入视频录制，手部追踪输出手部骨架与掌心位姿并接入手势识别，手势识别驱动采集状态机，由状态机启停录制；每条演示通过 Wi-Fi 上传到实验室服务器" loading="lazy"></a>
<figcaption>全部运行在 Quest 上：相机采集、手部追踪、手势识别，以及与 UMI 共用的采集状态机。</figcaption>
</figure>

## 准备工作：逐一验证信号

在录制大量数据之前，我先确认每一路信号都足以用于训练。数据集的价值取决于其中最差的那一路信号。

### 1. 手部追踪 → 仿真灵巧手

Quest 以 **OpenXR** 手部关节格式输出手部数据，而大多数手部重定向与学习代码使用 **MediaPipe** 的 21 关键点格式。我把每只 OpenXR 手转换为 MediaPipe **手部骨架**，再重定向到 **MuJoCo 中的Wuji 灵巧手**上。如果仿真手指能在张开、捏合、握拳等动作中平滑地跟随我的手指，就说明骨架数据足够可靠，可以录制。

<figure class="figure-media">
<video data-src="./images/projects/ego/wuji-sim-teleop.mp4" muted loop playsinline preload="none" aria-label="头显视角：操作员的手在动，显示器上的仿真Wuji 灵巧手同步复现手指动作"></video>
<figcaption>头显视角下，我的手通过转换后的手部骨架驱动 MuJoCo 中的Wuji 灵巧手（显示器画面）。2 倍速。</figcaption>
</figure>

### 2. 掌心位姿 → 真实机械臂

手指只是一半的信号，手的 **6 自由度位姿**同样重要。手部追踪会给出手腕关节，但实测中**掌心中心明显更稳定**，所以 EGO 录制的是**掌心位姿**。为了在真实条件下验证，我通过自己的 [VR 遥操作平台](#/projects/vr-teleoperation)徒手遥操作机械臂，让机械臂跟随掌心位姿。

<figure class="figure-media">
<video data-src="./images/projects/ego/palm-teleop.mp4" muted loop playsinline preload="none" aria-label="徒手遥操作：操作员的手带着追踪坐标轴移动，机械臂随之运动"></video>
<figcaption>徒手遥操作：机械臂跟随追踪到的掌心位姿（手上的坐标轴）。1.5 倍速。背景人脸已打码。</figcaption>
</figure>

### 3. 在 Quest 内加载双目 UVC 相机

EGO 不依赖 Quest 自带的摄像头，而是录制自己的相机：头显上的**双目 UVC 相机**通过 USB-C 接入，**由 Quest 应用直接采集**，不需要额外的电脑。在应用中选择相机、指定左右眼画面、设置目标帧率，然后打开实时预览。

<figure class="figure-media">
<video data-src="./images/projects/ego/camera-setup.mp4" muted loop playsinline preload="none" aria-label="Quest 应用中：配置双目 UVC 相机并打开实时预览"></video>
<figcaption>在 Quest 应用中连接并配置双目相机，最后打开实时预览。4 倍速。人脸已打码。</figcaption>
</figure>

## 数据录制

### 手势指令，同一个状态机

没有按键可按，操作员用**双手手势**控制录制。识别器对每只手的姿态进行分类（石头、布、竖拇指），只有**双手同时保持该姿态片刻**才会触发指令，因此任务过程中正常的手部动作不会误触发。

| 手势 | 指令 |
| --- | --- |
| 双手握拳，保持约 1 秒 | 开始 / 结束录制 |
| 双手竖起大拇指 | 将本条演示标注为**成功** |

这些指令接入**与 UMI 相同的状态机**，两套系统以同样的方式产生演示数据：

```
空闲 ──开始──▶ 录制中 ──结束──▶ 复核 ──标注──▶ 上传中 ──▶ 空闲
```

### 录制过程

<figure class="figure-media">
<video data-src="./images/projects/ego/recording-demo.mp4" muted loop playsinline preload="none" aria-label="头显视角录制一条演示：先设置任务，再用双手叠毛巾，视野中浮现手势识别结果"></video>
<figcaption>头显视角下录制一条演示。浮动的文字（"PaperRight"、"RockPoseLeft"、"ThumbPose…"）是手势识别器的实时输出。1.5 倍速。人脸已打码。</figcaption>
</figure>

### 录制内容

每条演示包含：

- 头显相机的**左右并排双目视频**
- 双手的**手部骨架**（MediaPipe 21 关键点格式）
- 双手的**掌心轨迹**（随时间变化的掌心位姿）
- 本条演示的**标注**

下面是一条叠毛巾演示的双目画面：

<figure class="figure-media">
<video class="wide-stereo" data-src="./images/projects/ego/stereo-view.mp4" muted loop playsinline preload="none" aria-label="胸口高度视角下叠毛巾的左右相机并排画面"></video>
<figcaption>头显相机的左右并排双目画面：同一时刻的左右视角，为学习提供深度信息。背景人脸已打码。</figcaption>
</figure>

以及从外部看同类演示的录制过程，注意开始、结束和标注时的双手**手势指令**：

<figure class="figure-media">
<video data-src="./images/projects/ego/third-person.mp4" muted loop playsinline preload="none" aria-label="第三人称视角：数据采集员将头显挂在颈部叠毛巾，字幕标出开始、结束与标注手势"></video>
<figcaption>数据采集员将头显挂在颈部，录制一条叠毛巾演示：双手握拳<strong>开始</strong>，再次双手握拳<strong>结束</strong>，双手竖起大拇指标注为<strong>成功</strong>。人脸已打码以保护隐私。</figcaption>
</figure>

## 相关项目

- [UMI 数据采集](#/projects/umi-data-collection)：EGO 所基于的手持夹爪采集系统
- [VR 遥操作](#/projects/vr-teleoperation)：掌心位姿真机测试所用的平台
