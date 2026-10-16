---
title: 机器人 VR 遥操作平台
summary: 基于 Meta Quest 的机器人远程遥操作应用和 LiveKit 实时通信设施。一套不绑定具体机器人的接口同时驱动 xArm 机械臂和灵巧手人形机器人。
role: 创始工程师，负责平台的端到端设计与开发：Quest 应用（Unity + OpenXR）、LiveKit 房间架构、不绑定具体机器人的遥操接口和各机器人的桥接程序、手柄标定，以及数据采集流程。
brief: 一个 Quest 应用经 LiveKit 房间发送统一的遥操指令，就能控制不同的机器人，其他人也能实时观看。
facts: 200 Hz :: 遥操指令发送频率 || 30 fps :: 机器人相机视频流 || 3 台 :: 单个房间实测机器人数，点一下即可切换
---

## 概要

一个 Meta Quest 应用就能遥操作 xArm 7 机械臂和配备 Wuji 灵巧手的人形机器人。机器人同处一个 LiveKit 房间，操作员点一下即可切换。单个房间已实测 3 台机器人，架构本身并没有这个上限。

遥操作既能为机器人学习采集示教数据，也能操控远处的机器人。它要求控制、视频和音频实时双向传输。每台机器人还只接受适配自身关节的指令。

操作员、机器人和观察者都以参与者身份加入同一个 LiveKit 房间。头显以 200 Hz 通过不可靠通道发布一种不绑定具体机器人的遥操指令。各机器人的桥接程序把它转换成自身硬件的命令，并以 30 fps 回传相机画面。

演示视频中，操作员在同一房间的两台 xArm 7 之间点一下就完成切换。在人形机器人上，徒手追踪配合脚踏板跑通了录制、标注、复位的完整流程。

录制、标注和复位都在同一次头显会话中完成。因此平台本身也能产出机器人学习数据，与我的 [UMI](#/projects/umi-data-collection) 和 [EGO](#/projects/ego-data-collection) 采集装置并用。

<details>
<summary>技术组件通俗解释</summary>

| 组件 | 是什么 | 在本项目中的作用 |
| --- | --- | --- |
| **Meta Quest 3** | 一体机头显，能在三维空间中追踪头部、双手和两个手柄。它还能通过摄像头显示真实环境（混合现实） | 操作员的输入设备和显示器 |
| **OpenXR** | XR 设备的开放标准，相当于应用和设备之间的“通用语言” | 读取头部、手部和手柄的追踪数据，不必绑死在某一家厂商的 SDK 上 |
| **Unity** | 实时 3D 引擎，在游戏和 XR 开发中很常用 | 开发应用本身：悬浮面板、视频画面和输入处理 |
| **LiveKit** | 开源实时通信平台，基于 **WebRTC**（浏览器视频通话背后的技术） | 在会话各方之间传输视频、音频和控制数据 |
| **房间 / 参与者** | LiveKit 的基本模型：*房间*类似一场视频会议。里面的每个成员都是*参与者*，既能发布自己的流，也能订阅别人的流 | 操作员、机器人和观察者都加入同一个房间 |
| **可靠 vs. 不可靠消息** | 可靠消息一定会送达，但可能晚到；不可靠消息要么很快送达，要么直接丢掉 | 遥操指令走不可靠通道（见“关键设计取舍”）。确认消息和文本走可靠通道 |

</details>

## 关键设计取舍

| 设计取舍 | 原因 | 本项目中的体现 |
| --- | --- | --- |
| 所有成员都是房间参与者 | 新增机器人或观看者只需加入房间，不用另搭基础设施 | 单个房间实测 3 台机器人。数据采集看板和其他头显可实时观看 |
| 统一的遥操指令 | 各机器人的桥接程序把同一条指令映射到自身关节 | 同一个应用驱动 xArm 7 机械臂和人形机器人。切换机器人只需点一下 |
| 控制指令走不可靠通道 | 只有最新的位姿有意义，晚到的指令直接丢弃，不会排在更新的指令后面 | 遥操指令以 200 Hz 发送 |

## 房间架构

<figure class="figure-media">
<a href="./images/projects/vr-teleop/room-architecture.svg" target="_blank" rel="noreferrer"><img src="./images/projects/vr-teleop/room-architecture.svg" alt="房间示意图：令牌服务只向已认证用户发放访问权限；房间由自建的 LiveKit 服务器托管；房间内，遥操作员以 200 Hz 向选中的机器人 A 发送遥操指令，并接收相机视频、音频和确认消息；机器人 B、C 待命；数据采集看板等观察者接收实时视频；云端语音助手与操作员对话" loading="lazy"></a>
<figcaption>所有参与者同处一个房间，遥操指令只发给选中的机器人。图中是逻辑关系，实际上所有数据流都经由 LiveKit 服务器转发。</figcaption>
</figure>

每个会话对应自建 LiveKit 服务器上的一个房间。访问权限由小型令牌服务发放，只有通过认证的用户才能加入。操作员从列表里选中一台机器人，应用就只给它发遥操指令。其他机器人收不到指令，保持当前位姿。

<details>
<summary>参与者与数据流</summary>

| 参与者 | 作用 |
| --- | --- |
| 遥操作员 | 即 Quest 应用。以 200 Hz 发布遥操指令，同时发布头显相机和麦克风。订阅机器人的视频、音频和确认消息。 |
| 机器人 | 通过各自的机器人桥接程序加入，桥接程序把遥操指令转换成这台机器人的控制命令。发布相机、麦克风和 ACK（表示指令已送达）。 |
| 观察者 | 只看不操作。主要是团队的数据采集看板，这个网页显示房间内的实时相机画面，也能在头显里打开。其他头显也可以加入观看。 |
| 云端语音助手 | 与操作员对话，发送用于语音合成的文本和音频。 |

<figure class="figure-media figure-medium">
<img src="./images/projects/vr-teleop/dashboard.jpg" alt="头显面板中的数据采集看板网页：房间配置（房间名称和 Join Room 按钮），以及发布者选择" loading="lazy">
<figcaption>在头显里打开的数据采集看板：先加入房间，再选择要看哪个参与者的画面。</figcaption>
</figure>

</details>

<details>
<summary>头显应用结构</summary>

<figure class="figure-media">
<a href="./images/projects/vr-teleop/client-architecture.svg" target="_blank" rel="noreferrer"><img src="./images/projects/vr-teleop/client-architecture.svg" alt="客户端三层架构：连接层为 LiveKitRoomManager；数据接入层为 LiveKitPublisher 和 LiveKitSubscriber；界面层中，DataSource、VideoSource、AudioSource 把数据交给发布端，订阅端再把数据交给 DataSink、VideoSink、AudioSink" loading="lazy"></a>
<figcaption>Quest 应用分三层：连接房间、收发数据流、呈现给操作员。</figcaption>
</figure>

应用分为三层，每层都能单独修改，互不影响。`LiveKitRoomManager` 负责加入房间，并记录房间里还有哪些参与者。`LiveKitPublisher` 发送头显自身的数据流，`LiveKitSubscriber` 接收其他参与者的数据流。*Source* 生成操作员要发出的内容。*Sink* 把收到的数据流转成视频面板、机器人音频、语音助手和 ACK 状态文字。

<figure class="figure-media">
<img src="./images/projects/vr-teleop/headset-streams.jpg" alt="头显内画面：网页面板显示腕部相机的实时画面，相机面板显示 Arducam USB 相机的画面，设置面板提供曝光、ISO、亮度、对比度、饱和度和白平衡滑块" loading="lazy">
<figcaption>头显内画面：左边是房间里的实时画面，中间是接在 Quest 上的 USB 相机画面。这台相机的曝光、ISO 和白平衡可以在头显里直接调节（右）。</figcaption>
</figure>

头显还能采集接在 Quest 上的 USB（UVC）相机画面，曝光、ISO、亮度和白平衡都能在 VR 里调。我的 [EGO 数据采集](#/projects/ego-data-collection)方案就搭建在这项功能上。混合现实透视让面板周围始终能看到真实环境，操作员清楚自己站在哪里。

</details>

## 一种指令，多种机器人

应用从不直接和某台具体的机器人通信，只发送一种不绑定具体机器人的遥操指令。指令包括每只手或每个手柄的目标位姿、夹爪或手指的状态，以及按键标志位。各机器人的桥接程序再把它转换成自身硬件的控制命令。

在 xArm 7 机械臂上，桥接程序对接 xArm 控制器，一只手对应一条机械臂。机械臂可以单臂使用，也可以组成双臂工作台。在配备 Wuji 灵巧手的人形机器人上，桥接程序对接手臂和灵巧手控制器。手指由手部追踪驱动。接入新机器人只需新写一个桥接程序，应用本身不用改。

手柄标定让每套装置的坐标轴只需对齐一次。每个人握手柄的姿势不同，有些装置还有特定的安装方式，坐标轴可能因此旋转。标定矩阵把实际握持姿态映射到桥接程序约定的标准坐标轴上。后来做手部遥操作时，[掌心位姿](#/projects/ego-data-collection)也沿用了这套对齐。

## 演示视频

### 同一房间内切换机器人

<figure class="figure-media figure-medium">
<video data-src="./images/projects/vr-teleop/fleet-switching.mp4" muted loop playsinline preload="none" style="aspect-ratio: 1 / 1" aria-label="头显视角：操作员先操控一组 xArm 7 双臂，在头顶的面板中点选另一台机器人，然后操控这第二台机器人"></video>
<figcaption>一名操作员在同一房间的两台 xArm 7 机器人之间，点一下就完成切换。操作员先操控其中一台，在头顶的面板里点选另一台，再操控它。画面中的白色矩形是实时视频面板，头显录屏录不到。1.5 倍速。</figcaption>
</figure>

### xArm 标定与实时视频

<figure class="figure-media">
<video data-src="./images/projects/vr-teleop/xarm-calibration.mp4" muted loop playsinline preload="none" aria-label="头显视角：带标定设置的 LiveKit 连接面板、手柄坐标轴、机器人相机的实时缩略图，以及跟随手柄运动的 xArm"></video>
<figcaption>xArm 跟随标定后的手柄运动，机器人相机画面实时传回头显。这是为手部遥操作做的预测试。画面中有标定后的手柄坐标轴、房间面板和机器人相机实时画面（右上）。1.5 倍速。</figcaption>
</figure>

### 人形机器人手部遥操作

这套平台同样能控制配备 Wuji 灵巧手的人形机器人（由 [Theta Intelligence](https://www.theta-intelligence.com/) 提供），用徒手追踪操作。脚踏板通过 BLE 与 Quest 配对，用来启用每条手臂、开始或停止录制，不占用双手。机器人端为每条演示录下相机画面、关节状态和收到的指令。操作员随后用手柄标注这条演示（保存或丢弃），并让手臂复位。

<figure class="figure-media">
<video data-src="./images/projects/vr-teleop/humanoid-hand-teleop.mp4" muted loop playsinline preload="none" aria-label="人形机器人数据采集分步演示：连接房间、切换到手部追踪、用脚踏板配合双臂手部遥操作、录制、标注和复位"></video>
<figcaption>整个数据采集流程都在头显里完成。分步演示：连接房间、切换到手部追踪、对齐后踩踏板启用、录制、标注和复位。视频已加速（2–3 倍），重复的第二条录制已剪掉。人脸已打码。</figcaption>
</figure>

## 相关项目

- [EGO 数据采集](#/projects/ego-data-collection)：手部追踪与掌心位姿，已在本平台上验证
- [UMI 数据采集](#/projects/umi-data-collection)：手持夹爪数据采集，由同类头显状态机驱动
