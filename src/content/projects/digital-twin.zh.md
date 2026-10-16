---
title: 混合现实数字孪生：在 Quest 头显里呈现机器人数据
summary: Quest 应用把远端机器人的环境搬进混合现实：双目视频、深度点云、PLY 扫描、实时 URDF 孪生和按 6D 位姿摆放的物体。
role: 端到端搭建了整套可视化：双目和点云着色器、深度和 PLY 渲染器、URDF 运行时加载与关节同步，以及把物体位姿转换到机器人基座坐标系的处理链路。
brief: 把远端机器人的环境带进 Quest 头显：双目视频、深度点云、15 Hz 同步的 URDF 孪生和物体 6D 位姿。
facts: 15 Hz :: 推送给孪生的机器人关节角度 || 220 万 :: PLY 扫描演示的点数，一次绘制调用画完 || 2 路 :: 双目视频，左右眼各一路
---

## 概要

一个 Quest 应用让操作员在混合现实中看到远端机器人的整个环境。双目视频、实时深度、扫描场景、机器人关节状态和周围物体，都呈现在同一个视图里。

单路平面视频看不出距离，远程操作员很难判断远近、安全操作。每类数据还需要各自的渲染方式。物体位姿是在相机坐标系下给出的，必须转换到机器人坐标系。

GPU 渲染器把深度视频逐像素转成点云。URDF 孪生在运行时下载，跟随以 15 Hz 推送的关节角度运动。一串刚体变换把 FoundationPose 的估计结果转到机器人基座坐标系。

在下面的录屏中，操作员只看远端 2K 相机的双目画面，就伸手拿起了一只手套。220 万个点的地铁车厢 PLY 扫描用一次绘制调用画完，还能进到车厢里浏览。遥操作时，双臂 xArm 7 孪生同步复现真实机械臂的动作。检测到的物体按机器人坐标系摆在孪生桌面上。

实时数据流复用我[遥操作平台](#/projects/vr-teleoperation)的 LiveKit 房间，无需另建流媒体服务。接入新机器人只需上传一份 URDF，不用重新构建应用。

## 设计优势

| 常规做法 | 本方案 | 演示结果 |
| --- | --- | --- |
| 单路视频，画面是平的 | ZED 2i 双目相机推送两路视频轨道，左右眼各一路 | 操作员只看双目画面就拿起了手套 |
| 机器人模型打包在应用里 | 运行时从 S3 下载 URDF，由 15 Hz 关节角度数据流驱动 | Theta Intelligence 机器人和 xArm 7 已加载为孪生 |
| 另建一套流媒体服务 | 实时数据流复用遥操作平台的 LiveKit 房间 | 视频、深度、关节状态和物体位姿共用现有房间 |
| PnP，依赖手工挑选的 2D–3D 特征匹配 | FoundationPose 把图像与物体的 3D 模型做匹配 | 没有标记、没有特殊纹理的日常物体也能摆放到位 |

渲染全部在 GPU 上完成。左右眼视频由自定义着色器处理，每个点云只用一次绘制调用。数百万点的扫描因此能在一体机上渲染。

## 数据如何进入头显

<figure class="figure-media">
<a href="./images/projects/digital-twin/data-flow.svg" target="_blank" rel="noreferrer"><img src="./images/projects/digital-twin/data-flow.svg" alt="数据流：ZED 2i 双目相机和深度相机经 LiveKit 房间发送视频轨道；PLY 文件在头显上加载；15 Hz 的机器人关节角度和物体 6D 位姿走 LiveKit 数据通道；URDF 模型在运行时从 S3 存储桶获取；在 Quest 中，双目着色器、深度点云渲染器、PLY 渲染器、URDF 机器人孪生和物体标记各自绘制对应的数据" loading="lazy"></a>
<figcaption>头显上每路数据都有专门的渲染器。实时数据流经 LiveKit 房间传输，PLY 扫描和 URDF 文件则单独加载。</figcaption>
</figure>

视频、深度和音频作为媒体轨道传输，关节角度和物体位姿走房间的数据通道。机器人 URDF 在运行时从 S3 存储桶下载。面板还能播放远端麦克风的声音，并显示音量。

<details>
<summary>技术组件一览</summary>

| 组件 | 是什么 | 在本项目中的作用 |
| --- | --- | --- |
| **数字孪生** | 真实物体的实时虚拟副本，随实物变化而更新 | 虚拟的机器人和场景，与真实环境保持一致 |
| **着色器（Shader）** | 在显卡（GPU）上运行的小程序，决定每个像素或点怎么绘制 | 让左右眼各看到自己的画面；把深度转成 3D 点 |
| **双目相机** | 并排的两个摄像头，就像人的一双眼睛 | 给头显提供两个略有差异的视角，让大脑产生深度感 |
| **深度相机 / 点云** | 深度相机能测出每个像素的距离，由此得到的一组 3D 点就是点云 | 在 3D 中重建场景，可以绕着看 |
| **PLY 文件** | 常用的点云存储格式 | 把预先扫描好的 3D 场景加载到头显里 |
| **URDF** | 标准的机器人描述格式，包含连杆、关节和 3D 网格 | 用与真机相同的描述文件构建虚拟机器人 |
| **6D 位姿** | 物体的位置（x、y、z）加朝向（三个旋转角） | 把检测到的物体精确放到它在现实中的位置 |

</details>

## 头显中的效果

### 带深度的双目视频

ZED 2i 双目相机推送左、右两路视频轨道，到达头显后成为 GPU 纹理。自定义的 Unity 着色器再让每只眼睛只看到对应那台相机的画面。

<figure class="figure-media figure-medium">
<video data-src="./images/projects/digital-twin/stereo-glove.mp4" muted loop playsinline preload="none" style="aspect-ratio: 1 / 1" aria-label="头显视角：远端相机的双目视频面板中，操作员的手臂伸进画面，拿起一只手套"></video>
<figcaption>靠真实的深度线索，操作员只看远端 2K 相机的双目画面就能拿起手套。头显录屏只能录下一只眼睛的画面，所以这里看不出深度效果本身。1.25 倍速。</figcaption>
</figure>

<details>
<summary>左右眼着色器</summary>

```hlsl
UNITY_SETUP_STEREO_EYE_INDEX_POST_VERTEX(i);
if (unity_StereoEyeIndex == 0)      // 左眼
    return tex2D(_MainTexLeft,  TRANSFORM_TEX(i.uv, _MainTexLeft));
else                                // 右眼
    return tex2D(_MainTexRight, TRANSFORM_TEX(i.uv, _MainTexRight));
```

头显在一次渲染中同时绘制双眼画面。着色器先通过 `unity_StereoEyeIndex` 判断当前画的是哪只眼，再采样对应的纹理。大脑会像处理真实双眼那样把两个视角融合起来。

</details>

### 实时深度点云

深度流把远端房间变成可以绕着走动观察的几何体。相机把彩色画面和深度画面分成两路视频轨道发送。GPU 渲染器为每个像素画一个点，再按该像素的深度沿视线方向把点推出去。两个滑块分别调节深度比例和点的大小。

<figure class="figure-media figure-medium">
<video data-src="./images/projects/digital-twin/depth-point-cloud.mp4" muted loop playsinline preload="none" style="aspect-ratio: 1 / 1" aria-label="头显视角：由深度视频实时生成的房间点云，观看者移动时透视随之变化"></video>
<figcaption>由深度视频实时生成的点云是真正的几何体。视角移动时，物体边缘会与后方的背景分开。2 倍速。</figcaption>
</figure>

### PLY 扫描场景

预先扫描的场景从二进制 PLY 文件读入 GPU 缓冲区，一次绘制调用（draw call）就能画出全部点。点云放在一个盒子里，用户可以抓取、移动和缩放。演示用的地铁车厢扫描共 220 万个点，放大后人可以站在车厢里面。

<figure class="figure-media figure-medium">
<video data-src="./images/projects/digital-twin/ply-subway.mp4" muted loop playsinline preload="none" style="aspect-ratio: 1 / 1" aria-label="头显视角：用户抓起盒子里的地铁车厢点云小模型，不断放大，直到自己置身车厢之中"></video>
<figcaption>220 万个点的地铁车厢可以整体抓起、放大，再从内部浏览。扫描来自开源数据集。1.25 倍速。背景人脸已打码。</figcaption>
</figure>

### URDF 机器人孪生

虚拟机器人由真机的 URDF 构建，URDF 在运行时从 S3 存储桶下载。关节角度以 15 Hz 的频率，经遥操作所用的同一条 LiveKit 数据通道传来。头显再把它们作用到模型的对应关节上。

孪生有三种放置方式。ArUco 标记让它与真机精确对齐。用户也可以抓起孪生，放到任意位置，比如桌面上。第三种方式按机器人的导航地图实时定位，移动机器人在房间里走动时，孪生也跟着移动。

<figure class="figure-media figure-medium">
<video data-src="./images/projects/digital-twin/robot-twin.mp4" muted loop playsinline preload="none" style="aspect-ratio: 1 / 1" aria-label="混合现实：真实机器人旁出现白色的虚拟机器人模型；操作员遥操作时，桌上的双臂 xArm 孪生复现真实机械臂的动作"></video>
<figcaption>操作员遥操作时，xArm 孪生同步复现身后真实机械臂的动作。Theta Intelligence 机器人和双臂 xArm 7 都以孪生形式加载在混合现实中。1.5 倍速。人脸已打码。</figcaption>
</figure>

### 机器人坐标系下的物体

检测到的物体显示在孪生桌面上，位置与真实桌面上的物体对应。标定好的相机拍摄工作区，FoundationPose 根据物体的 3D 模型估计其 6D 位姿。这个位姿在相机坐标系下，要经过一串刚体变换才能转到机器人坐标系。

<figure class="figure-media">
<a href="./images/projects/digital-twin/frame-chain.svg" target="_blank" rel="noreferrer"><img src="./images/projects/digital-twin/frame-chain.svg" alt="坐标系链：物体经 FoundationPose 变换到相机，相机经 ArUco 手眼标定变换到机器人基座，机器人基座再经孪生放置变换到 AR 中的孪生" loading="lazy"></a>
<figcaption>把这些变换按顺序相乘，就能把物体从相机视角搬到孪生的桌面上。每个箭头代表一次刚体变换。</figcaption>
</figure>

<figure class="figure-media figure-medium">
<video data-src="./images/projects/digital-twin/object-poses.mp4" muted loop playsinline preload="none" style="aspect-ratio: 1 / 1" aria-label="头显视角：虚拟桌面上有双臂孪生，蓝色小方框标出检测到的物体，后方显示器上正在运行感知程序"></video>
<figcaption>检测到的物体（蓝色方框）按机器人坐标系摆在孪生桌面上。后方显示器上运行着感知程序。1.25 倍速。</figcaption>
</figure>

<details>
<summary>坐标变换与标定</summary>

记 $T_{A \leftarrow B}$ 为“把 $B$ 坐标系下的坐标转换到 $A$ 坐标系”的变换，则：

$$
T_{\text{base} \leftarrow \text{object}} = T_{\text{base} \leftarrow \text{camera}} \; T_{\text{camera} \leftarrow \text{object}}
$$

- $T_{\text{camera} \leftarrow \text{object}}$ 由 FoundationPose 逐帧给出。
- $T_{\text{base} \leftarrow \text{camera}}$ 来自一次性的 ArUco 手眼标定。如果标定工具输出的是反方向的 $T_{\text{camera} \leftarrow \text{base}}$，要先求逆。另外还要确认结果对应的是机器人基座还是标定板坐标系。

</details>

<details>
<summary>与经典 PnP 的对比</summary>

在 FoundationPose 这类学习模型出现之前，标准做法是 PnP（Perspective-n-Point）。它根据若干已知 3D 点及其在图像中的位置，求出物体相对相机的位姿。OpenCV 的实现以 3D 点、对应的 2D 像素坐标、相机内参 $K$ 和畸变系数为输入。输出是旋转 $R$ 和平移 $t$：

> 1. 在物体上定义坐标系，测出若干特征点的 3D 坐标。
> 2. 在图像中找到这些点的像素位置。
> 3. 用 `cv2.solvePnPRansac()` 求解 $R, t$。
> 4. 把 3D 点重投影回图像，检查误差。
> 5. 用相机外参把位姿转换到目标坐标系。

最难的几乎总是第 2 步：找到可靠的 2D–3D 对应点。遮挡和反光会导致匹配失败。对称物体也有歧义，比如无纹理的圆柱绕自身轴线怎么转看起来都一样。FoundationPose 则直接把图像与物体的 3D 模型做匹配。没有标记、也没有特殊纹理的日常物体同样适用。

</details>

## 相关项目

- [VR 遥操作平台](#/projects/vr-teleoperation)：本项目所基于的房间、机器人和流媒体基础设施
- [EGO 数据采集](#/projects/ego-data-collection)：另一个围绕双目相机视频的 Quest 应用
