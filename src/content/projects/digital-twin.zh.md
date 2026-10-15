---
title: 混合现实数字孪生：在 Quest 头显中呈现机器人数据
summary: 把真实世界以多层实时数据的形式带进 Meta Quest 头显：有真实深度感的双目视频、深度相机点云、扫描得到的 3D 场景、与真实机器人同步运动的 URDF 数字孪生，以及按真实 6D 位姿放置的检测物体。
role: 端到端实现整套可视化：双目与点云着色器、深度与 PLY 渲染器、运行时 URDF 加载与关节同步，以及转换到机器人基座坐标系的物体位姿链路。
---

## 速览

- **是什么**：在 Quest 头显里同时看到机器人所处的世界：视频、深度、3D 扫描、机器人实时状态和周围的物体
- **为什么**：远程操作员需要的不只是一路平面视频。深度、几何与机器人状态让人在不在现场的情况下也能判断距离、安全操作
- **亮点**：逐眼渲染的双目着色器带来真实深度感 · 深度视频逐像素生成 GPU 点云 · 数百万点的 PLY 扫描 · 运行时从云端加载 URDF，15 Hz 同步 · 机器人坐标系下的 FoundationPose 物体位姿 · 全部复用我的[遥操作平台](#/projects/vr-teleoperation)的 LiveKit 基础设施

## 用通俗的话介绍技术组件

| 技术组件 | 是什么 | 在这里的作用 |
| --- | --- | --- |
| **数字孪生** | 真实物体的实时虚拟副本，随真实物体的变化而更新 | 与真实机器人和场景同步的虚拟机器人与场景 |
| **着色器（Shader）** | 运行在显卡（GPU）上的小程序，决定每个像素或点如何绘制 | 让左右眼看到各自的画面；把深度变成 3D 点 |
| **双目相机** | 并排的两个摄像头，就像一双眼睛 | 为头显提供两个略有差异的视角，让大脑感知深度 |
| **深度相机 / 点云** | 能测量每个像素距离的相机；点云就是由此得到的一堆 3D 点 | 以 3D 形式重建场景，可以绕着观察 |
| **PLY 文件** | 存储点云的常用文件格式 | 把预先扫描好的 3D 场景加载进头显 |
| **URDF** | 机器人描述的标准格式：连杆、关节与 3D 网格模型 | 用与真实机器人相同的描述构建虚拟机器人 |
| **6D 位姿** | 物体的位置（x、y、z）加朝向（三个旋转角） | 把检测到的物体放在与现实完全一致的位置 |

## 数据如何进入头显

<figure class="figure-media">
<a href="./images/projects/digital-twin/data-flow.svg" target="_blank" rel="noreferrer"><img src="./images/projects/digital-twin/data-flow.svg" alt="数据流：ZED 2i 双目相机和深度相机通过 LiveKit 房间发送视频轨道；PLY 文件在头显上加载；15 Hz 的机器人关节角度和物体 6D 位姿通过 LiveKit 数据通道传输；URDF 模型运行时从 S3 存储桶获取；Quest 内由双目着色器、深度点云渲染器、PLY 渲染器、URDF 机器人孪生和物体标记分别绘制" loading="lazy"></a>
<figcaption>每一路数据在头显上都有专门的渲染器；实时数据复用遥操作平台的 LiveKit 基础设施。</figcaption>
</figure>

实时视频、深度和音频以轨道形式经由 **LiveKit 房间**传输（与我的[遥操作平台](#/projects/vr-teleoperation)相同的基础设施），关节角度、物体位姿等小型结构化数据走它的**数据通道**。静态资源来自存储：PLY 扫描在头显上加载，机器人 URDF **运行时从 S3 存储桶下载**。面板还承载**音频**（远端麦克风及音量指示），操作员不仅能看到、也能听到现场。

## 看见远端场景

### 双目视频：能"感觉到"的深度

单路视频看起来是平的。为了保留深度，**ZED 2i 双目相机**向头显推送左右**两路视频轨道**，在头显中以 GPU 纹理的形式接收。一个自定义 **Unity 着色器**让每只眼睛看到各自的相机画面：

```hlsl
UNITY_SETUP_STEREO_EYE_INDEX_POST_VERTEX(i);
if (unity_StereoEyeIndex == 0)      // 左眼
    return tex2D(_MainTexLeft,  TRANSFORM_TEX(i.uv, _MainTexLeft));
else                                // 右眼
    return tex2D(_MainTexRight, TRANSFORM_TEX(i.uv, _MainTexRight));
```

头显在一次渲染中同时绘制双眼，着色器通过 `unity_StereoEyeIndex` 判断当前绘制的是哪只眼睛，并采样对应的纹理。大脑会像融合真实双眼的画面一样融合这两个视角，场景就有了深度。

<figure class="figure-media figure-medium">
<video data-src="./images/projects/digital-twin/stereo-glove.mp4" muted loop playsinline preload="none" style="aspect-ratio: 1 / 1" aria-label="头显视角：远端相机的双目视频面板中，操作员的手臂伸入画面拿起一只手套"></video>
<figcaption>只看远端 2K 相机的双目画面就能伸手拿到手套，靠的正是真实的深度感。头显录屏只录下一只眼睛，因此无法在这里直接展示深度效果。1.25 倍速。</figcaption>
</figure>

### 深度相机生成实时点云

双目让人眼感知深度，**深度流**则让计算机获得深度。相机分别以视频轨道发送彩色画面和深度画面。在头显上，GPU 渲染器**为每个像素绘制一个点**，并按该像素的深度沿视线方向推出去，平面图像就变成了可以绕着观察的 3D 表面。两个滑块分别调节深度比例和点的大小。

<figure class="figure-media figure-medium">
<video data-src="./images/projects/digital-twin/depth-point-cloud.mp4" muted loop playsinline preload="none" style="aspect-ratio: 1 / 1" aria-label="头显视角：由深度视频实时生成的房间点云，视角移动时透视随之变化"></video>
<figcaption>由深度视频实时生成的点云。视角移动时，前景边缘与背景分离：这是几何体，而不是一张平面图片。2 倍速。</figcaption>
</figure>

### 来自 PLY 文件的扫描场景

不是所有内容都需要实时。**PLY 文件**保存预先扫描的 3D 场景。我的加载器把二进制 PLY 读入 GPU 缓冲区，一次绘制调用画出所有点，并放在一个可以抓取、移动、缩放的盒子里。演示中是一个**220 万点**的地铁车厢扫描（来自开源数据集），放大到可以站在车厢里面。

<figure class="figure-media figure-medium">
<video data-src="./images/projects/digital-twin/ply-subway.mp4" muted loop playsinline preload="none" style="aspect-ratio: 1 / 1" aria-label="头显视角：盒子里的地铁车厢点云小模型被抓起并放大，直到观看者置身车厢之中"></video>
<figcaption>220 万点的地铁车厢（来自开源数据集），抓取、放大后从内部浏览。1.25 倍速。背景人脸已打码。</figcaption>
</figure>

## 机器人的实时状态

### URDF 机器人孪生

头显根据机器人自己的 **URDF** 描述构建虚拟机器人，URDF **运行时从 S3 存储桶下载**。接入新机器人只需上传新的 URDF，无需重新构建应用。孪生随后跟随真实机器人：**关节角度以 15 Hz** 通过与遥操作相同的 LiveKit 数据通道传来，并作用到模型对应的关节上。

孪生有三种放置方式：

- **ArUco 标记**：与真实机器人精确对齐
- **抓取放置**：放到任意位置，比如面前的桌子上
- **导航地图**：根据机器人自己的导航地图实时放置，移动机器人的孪生会随它在房间里移动

<figure class="figure-media figure-medium">
<video data-src="./images/projects/digital-twin/robot-twin.mp4" muted loop playsinline preload="none" style="aspect-ratio: 1 / 1" aria-label="混合现实：白色虚拟机器人模型出现在真实机器人旁边；桌上的双臂 xArm 孪生随操作员遥操作复现真实机械臂的动作"></video>
<figcaption>在混合现实中加载的 Theta Intelligence 机器人与双臂 xArm 7 孪生。操作员遥操作时，xArm 孪生实时复现身后真实机械臂的动作。1.5 倍速。人脸已打码。</figcaption>
</figure>

### 按真实位姿显示检测到的物体

孪生展示了机器人，周围场景还需要**物体**。一台标定过的相机拍摄工作区，**FoundationPose** 根据物体的 3D 模型估计每个物体相对相机的 **6D 位姿**。这个位姿仍在*相机*坐标系中，需要通过一串变换转到*机器人*坐标系：

<figure class="figure-media">
<a href="./images/projects/digital-twin/frame-chain.svg" target="_blank" rel="noreferrer"><img src="./images/projects/digital-twin/frame-chain.svg" alt="坐标系链：物体经 FoundationPose 到相机，相机经 ArUco 手眼标定到机器人基座，机器人基座经孪生放置到 AR 中的孪生" loading="lazy"></a>
<figcaption>每个箭头都是一次刚体变换；按顺序相乘，就能把物体从相机视角放到孪生的桌面上。</figcaption>
</figure>

记 $T_{A \leftarrow B}$ 为"把 $B$ 坐标系中的坐标转换到 $A$ 坐标系"的变换，则：

$$
T_{\text{base} \leftarrow \text{object}} = T_{\text{base} \leftarrow \text{camera}} \; T_{\text{camera} \leftarrow \text{object}}
$$

- $T_{\text{camera} \leftarrow \text{object}}$ 由 **FoundationPose** 逐帧给出。
- $T_{\text{base} \leftarrow \text{camera}}$ 来自一次性的 ArUco **手眼标定**。如果标定工具输出的是反方向的 $T_{\text{camera} \leftarrow \text{base}}$，需要先求逆；还要确认外参对应的是机器人基座还是标定板坐标系。

得到的位姿通过房间的数据通道发送，在孪生的桌面上以方框显示，位置与真实桌面上的物体一致。

<figure class="figure-media figure-medium">
<video data-src="./images/projects/digital-twin/object-poses.mp4" muted loop playsinline preload="none" style="aspect-ratio: 1 / 1" aria-label="头显视角：带双臂孪生的虚拟桌面，蓝色小方框标出检测到的物体，后方显示器上运行着感知程序"></video>
<figcaption>检测到的物体（蓝色方框）以机器人坐标系放置在孪生桌面上，后方显示器上运行着感知程序。1.25 倍速。</figcaption>
</figure>

**经典位姿估计是怎么做的**：在 FoundationPose 这类学习方法出现之前，标准做法是 **PnP**（Perspective-n-Point）：已知物体上若干点的 3D 坐标及其在图像中的位置，求解物体相对相机的位姿。OpenCV 的实现输入 3D 点、对应的 2D 像素、相机内参 $K$ 和畸变系数，输出旋转 $R$ 与平移 $t$：

> 1. 在物体上定义坐标系，并获取一些特征点的真实 3D 坐标。
> 2. 在图片中检测这些点对应的像素坐标。
> 3. 用 `cv2.solvePnPRansac()` 求解 $R, t$。
> 4. 将 3D 点重新投影到图片上，检查误差。
> 5. 用相机外参转换到目标坐标系。

最难的几乎总是第 2 步：可靠地找到 2D–3D 对应点。遮挡和反光会让它失效，对称物体也存在歧义，例如无纹理的圆柱绕自身轴旋转无法区分。FoundationPose 通过与物体 3D 模型匹配，绕开了手工选取特征点，因此适用于没有标记、也没有特殊纹理的日常物体。

## 值得一提

- **多种数据，一个头显**：双目视频、深度、点云、机器人状态与物体位姿，各有专门的渲染器。
- **以 GPU 为核心的渲染**：自定义着色器和单次调用的点渲染，让数百万点与逐眼视频在一体机上依然流畅。
- **机器人即数据**：一个来自云存储的 URDF 加上一路关节数据流，新机器人就能以孪生的形式出现。
- **复用共享基础设施**：全部运行在[遥操作平台](#/projects/vr-teleoperation)的 LiveKit 房间之上。

## 相关项目

- [VR 遥操作平台](#/projects/vr-teleoperation)：本项目所依赖的房间、机器人与传输基础设施
- [EGO 数据采集](#/projects/ego-data-collection)：在 Quest 中使用外接 UVC 相机的另一个案例
