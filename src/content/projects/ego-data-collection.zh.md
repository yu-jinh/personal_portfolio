---
title: 基于 Meta Quest 3 的 EGO 数据采集
summary: 无需手持设备的第一视角采集：颈挂 Meta Quest 3 录制双目视频、双手骨架和掌心轨迹，双手手势驱动 UMI 的采集状态机。
role: 负责整套方案的设计与开发：Quest 应用（UVC 相机采集、手部追踪数据导出、手势识别、采集状态机），仿真和真机上的信号验证，以及录制链路。
brief: 颈挂 Quest 独立录制徒手演示的双目视频、手部骨架和掌心轨迹，并用手势控制开始、结束和标注。
facts: 3 → 1 :: 每条演示参与录制的设备数（UMI → EGO） || 21 :: 每只手的关键点数（MediaPipe 格式） || 6 自由度 :: 每只手录制的掌心位姿（代替手腕位姿） || 约 1 秒 :: 开始 / 结束录制时双手手势的保持时长
---

## 概要

EGO 只用一台挂在颈部的 Meta Quest 3，就能录下徒手完成任务的第一视角演示。每条演示包含双目视频、双手骨架、掌心轨迹和一个标注。它的前身 UMI 每条演示需要三台设备录制。

人的第一视角数据比机器人数据更容易规模化。任何人在任何地方都能录，手里也不用拿夹爪。难点在于，徒手时头显既没有按键可读，也没有手柄可追踪。

Quest 应用把 OpenXR 手部关节转换成 MediaPipe 格式，并录制 6 自由度掌心位姿。双目 UVC 相机通过 USB-C 接入头显，由应用直接采集。双手握拳保持约 1 秒，即可开始或结束录制。

正式录制前，三项测试验证了各路信号。转换后的手部骨架驱动了 MuJoCo 中的仿真 Wuji 灵巧手。掌心位姿驱动了真实机械臂。双目相机的配置和预览全部在 Quest 应用内完成。

手势指令接入 UMI 的状态机，两套系统生成演示的流程一致。每条演示也沿用 UMI 的上传链路，通过 Wi-Fi 上传。

## 从 UMI 到 EGO

EGO 由我的 [UMI 数据采集](#/projects/umi-data-collection)系统演化而来。UMI 的每条演示由 Quest 和两个各配一块树莓派 4 的夹爪共同录制。EGO 保留头显上的状态机，去掉了所有要拿在手里的硬件。

| | UMI 数据采集 | EGO 数据采集 |
| --- | --- | --- |
| 双手 | 手持夹爪 | 徒手，由 Quest 追踪 |
| 位姿信号 | 装在夹爪上的 Quest 手柄 | 手部追踪给出的掌心位姿 |
| 手部状态 | 通过 ArUco 标记得到的夹爪状态 | 手部骨架，每只手 21 个关键点 |
| 相机 | 每个夹爪两路腕部相机 + 头部双目相机 | 头显上的双目相机 |
| 指令 | 薄膜键盘 → 树莓派 → BLE | 双手手势指令 |
| 计算 | Quest + 每个夹爪一块树莓派 | 仅 Quest |
| 采集逻辑 | Quest 上的状态机 | **同一个**状态机 |

一台 Quest 取代了三台设备，承担整条录制链路。手势取代了薄膜键盘，双手可以专心完成任务。

## 系统架构

头显挂在颈部，双目相机从胸口高度俯视双手和桌面。操作员脸上没有遮挡，Quest 也照样能追踪双手。

<figure class="figure-media">
<a href="./images/projects/ego/architecture.svg" target="_blank" rel="noreferrer"><img src="./images/projects/ego/architecture.svg" alt="EGO 系统框图：在 Meta Quest 3 上，双目 UVC 相机接入视频录制模块；手部追踪输出手部骨架和掌心位姿，同时送入手势识别；手势识别驱动采集状态机，由状态机启停录制。每条演示通过 Wi-Fi 上传到实验室服务器" loading="lazy"></a>
<figcaption>所有模块都运行在 Quest 上：相机采集、手部追踪、手势识别，以及与 UMI 共用的采集状态机。</figcaption>
</figure>

<details>
<summary>手势指令与状态机</summary>

识别器把每只手的姿势分为石头、布、竖拇指三类。只有双手同时保持手势片刻，才会触发指令。任务中正常的手部动作因此不会误触发。

| 手势 | 指令 |
| --- | --- |
| 双手握拳，保持约 1 秒 | 开始 / 结束录制 |
| 双手竖大拇指 | 把这条演示标为**成功** |

这些指令接入与 UMI 相同的状态机：

```
空闲 ──开始──▶ 录制中 ──结束──▶ 复核 ──标注──▶ 上传中 ──▶ 空闲
```

</details>

## 信号验证

在投入几个小时录数据之前，每一路信号都先经过检查。数据集好不好用，取决于最差的那一路信号。

### 手部骨架 → 仿真灵巧手

Quest 输出 OpenXR 手部关节，而大多数手部重定向和学习代码需要 MediaPipe 21 关键点格式。应用把每只手转换成 MediaPipe 手部骨架，再重定向到 MuJoCo 中的 Wuji 灵巧手。仿真手指在张手、捏合、握拳时都平滑跟随，才算通过检验。

<figure class="figure-media">
<video data-src="./images/projects/ego/wuji-sim-teleop.mp4" muted loop playsinline preload="none" aria-label="头显视角：操作员的手在动，显示器上的仿真 Wuji 灵巧手同步做出相同的手指动作"></video>
<figcaption>仿真 Wuji 灵巧手通过转换后的手部骨架，跟随我的手指动作。画面为头显视角，仿真手显示在显示器上。2 倍速。</figcaption>
</figure>

### 掌心位姿 → 真实机械臂

手部追踪也会给出手腕关节，但实测中掌心中心更稳。因此 EGO 录制 6 自由度掌心位姿。我用自己的 [VR 遥操作平台](#/projects/vr-teleoperation)徒手遥操作机械臂，机械臂跟随掌心位姿运动。

<figure class="figure-media">
<video data-src="./images/projects/ego/palm-teleop.mp4" muted loop playsinline preload="none" aria-label="徒手遥操作：操作员手上叠加着追踪坐标轴，手一动，机械臂就跟着动"></video>
<figcaption>机械臂跟随追踪到的掌心位姿运动，位姿以坐标轴画在手上。1.5 倍速。背景人脸已打码。</figcaption>
</figure>

### 头显直采双目相机

EGO 的画面来自头显上的双目 UVC 相机，Quest 自带的摄像头不参与录制。整个过程不需要额外的电脑。

<figure class="figure-media">
<video data-src="./images/projects/ego/camera-setup.mp4" muted loop playsinline preload="none" aria-label="在 Quest 应用中配置双目 UVC 相机并打开实时预览"></video>
<figcaption>Quest 应用独立完成双目相机的配置。我在应用里选择相机、指定左右眼画面、设定目标帧率，再打开实时预览。4 倍速。人脸已打码。</figcaption>
</figure>

## 录制一条演示

<figure class="figure-media">
<video data-src="./images/projects/ego/recording-demo.mp4" muted loop playsinline preload="none" aria-label="头显视角录制一条演示：先设置任务，再用双手叠毛巾，视野里浮现手势识别结果"></video>
<figcaption>头显视角下，手势识别器在录制全程实时运行。浮动的文字（“PaperRight”“RockPoseLeft”“ThumbPose…”）就是它的输出。1.5 倍速。人脸已打码。</figcaption>
</figure>

<figure class="figure-media">
<video class="wide-stereo" data-src="./images/projects/ego/stereo-view.mp4" muted loop playsinline preload="none" aria-label="操作员叠毛巾时左右相机的并排画面，从胸口高度拍摄"></video>
<figcaption>同一时刻的左右两个视角，为学习提供深度信息。画面是头显相机在一条叠毛巾演示中的左右并排视图。背景人脸已打码。</figcaption>
</figure>

<figure class="figure-media">
<video data-src="./images/projects/ego/third-person.mp4" muted loop playsinline preload="none" aria-label="第三人称视角：数据采集员把头显挂在颈部叠毛巾，字幕标出开始、结束和标注手势"></video>
<figcaption>只靠手势，就能开始、结束和标注一条演示。数据采集员叠毛巾时，双手握拳<strong>开始</strong>，再次双手握拳<strong>结束</strong>，双手竖大拇指标为<strong>成功</strong>。为保护隐私，人脸已打码。</figcaption>
</figure>

## 相关项目

- [UMI 数据采集](#/projects/umi-data-collection)：EGO 的基础，一套基于手持夹爪的采集系统
- [VR 遥操作](#/projects/vr-teleoperation)：掌心位姿真机测试所用的平台
