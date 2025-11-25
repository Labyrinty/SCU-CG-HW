# WebGL 阴影渲染项目

这是一个基于 WebGL 的 3D 图形渲染项目，实现了 Phong 着色模型、纹理映射和高质量的软阴影效果。

## 项目特点

### 🎯 核心功能
- **Phong 着色模型** - 完整的环境光、漫反射和镜面反射计算
- **实时阴影渲染** - 使用改进的 PCF 软阴影技术
- **多纹理支持** - 2D 纹理和立方体贴图天空盒
- **交互式控制** - 完整的键盘和鼠标交互系统

### ✨ 阴影特性
- **5×5 PCF 软阴影** - 显著减少阴影锯齿
- **动态偏差计算** - 根据表面角度自动调整阴影偏移
- **实时参数调整** - 可调节阴影质量和外观

## 快速开始

### 环境要求
- 支持 WebGL 2.0 的现代浏览器
- 本地服务器环境（如 Live Server）

### 运行步骤
1. 将项目文件放置在 Web 服务器目录中
2. 启动本地服务器
3. 打开 `Phongshading.html`

### 文件结构
```
项目根目录/
├── Phongshading.html      # 主页面
├── Phongshading.js        # 主要逻辑
├── Models.js              # 几何模型
├── configTexture.js       # 纹理配置
├── configMaterialParameters.js # 材质参数
├── 着色器文件/
│   ├── box.vert/frag      # 主要物体着色器
│   ├── depth.vert/frag    # 深度贴图着色器
│   ├── lamp.vert/frag     # 光源显示着色器
│   └── skybox.vert/frag   # 天空盒着色器
├── Common/                # 工具库
└── skybox/               # 天空盒纹理
```

## 交互控制

### 🎹 键盘控制
| 按键 | 功能 |
|------|------|
| **C/V** | 切换点光源/平行光源 |
| **Y/U** | 拉大/缩小光源距离 |
| **W/S** | 光源绕 X 轴旋转 |
| **A/D** | 光源绕 Y 轴旋转 |
| **I/K** | 摄像机俯仰角调整 |
| **J/L** | 摄像机水平角调整 |
| **M/N** | 投影视角缩放 |
| **</>** | 摄像机距离调整 |
| **空格** | 重置所有参数 |

### 🖱️ 鼠标控制
| 操作 | 功能 |
|------|------|
| **左键拖拽** | 旋转摄像机 |
| **中键拖拽** | 平移场景 |
| **右键拖拽** | 缩放摄像机 |

## 阴影技术实现

### PCF 软阴影改进
本项目采用了改进的 5×5 Percentage-Closer Filtering 技术：

#### 核心特性
- **25 个采样点** - 相比传统的 3×3 PCF 提供更平滑的边缘
- **动态偏差计算** - 基于表面法线和光照方向的自适应偏移
- **深度范围检查** - 防止远处物体的阴影伪影

#### 实现代码
```glsl
// 5x5 PCF 采样
for(int x = -2; x <= 2; ++x) {
    for(int y = -2; y <= 2; ++y) {
        float pcfDepth = texture(depthTexture, projCoords.xy + vec2(x, y) * texelSize).r;
        shadow += (currentDepth - bias) > pcfDepth ? 1.0 : 0.0;
    }
}
shadow /= 25.0;
```

#### 优势
- ✅ 显著减少阴影边缘的锯齿
- ✅ 保持实时性能
- ✅ 无需额外的渲染通道
- ✅ 兼容所有现代 GPU

## 性能优化

### 渲染优化
- 深度贴图分辨率：1024×1024
- 视锥体剔除优化
- 纹理压缩和 Mipmap
- 批量渲染调用

### 质量平衡
在 5×5 PCF 和性能之间取得了良好平衡，在大多数现代硬件上都能保持 60fps。

## 扩展可能性

### 可选的增强功能
1. **VSM (Variance Shadow Mapping)** - 更高质量的软阴影
2. **PCSS (Percentage-Closer Soft Shadows)** - 基于距离的软阴影
3. **CSM (Cascaded Shadow Maps)** - 大场景阴影支持
4. **实时 GI (Global Illumination)** - 更真实的光照

## 技术栈

- **WebGL 2.0** - 图形渲染 API
- **GLSL ES 3.0** - 着色器编程
- **JavaScript** - 应用逻辑
- **HTML5 Canvas** - 显示输出

## 浏览器兼容性

- Chrome 56+ ✅
- Firefox 51+ ✅  
- Safari 11+ ✅
- Edge 79+ ✅

## 许可证

本项目仅用于教育和学习目的。