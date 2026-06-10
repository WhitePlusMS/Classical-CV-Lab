import Link from 'next/link';

const systemChain = [
  { title: '光源', desc: '提供照明、克服环境光干扰、形成稳定成像条件' },
  { title: '目标', desc: '被观测的物体或场景' },
  { title: '镜头', desc: '将目标成像到传感器光敏面，决定视场和清晰度' },
  { title: '摄像机', desc: '通过 CCD/CMOS 光电转换，输出电信号' },
  { title: '采集设备', desc: '图像采集卡或嵌入式模块，完成模数转换' },
  { title: '处理设备', desc: '计算机或嵌入式计算平台，运行视觉算法' },
] as const;

const lightingRoles = [
  '照亮目标，提高目标亮度',
  '形成最有利于图像处理的成像效果',
  '克服环境光干扰，保证图像的稳定性',
  '用作测量的工具或参照',
] as const;

const lightingTypes = [
  { title: '条形光源', desc: '条状均匀照明', useCase: '大面积/长条形目标' },
  { title: '环形光源', desc: '环形漫射光，消除阴影', useCase: '微小元件定位、字符识别' },
  { title: '同轴光源', desc: '垂直同轴照明，消除镜面反射', useCase: '反光表面、平整物体检测' },
] as const;

const sensorComparison = [
  { feature: '读出方式', ccd: '统一读出节点，电荷逐像素转移至输出', cmos: '每个像元独立完成电荷→电压转换' },
  { feature: '信号输出', ccd: '模拟电压串行输出', cmos: '数字信号选通直接输出' },
  { feature: '噪声水平', ccd: '低（统一读出路径）', cmos: '较高（每个像元独立路径）' },
  { feature: '集成度', ccd: '片外电路复杂', cmos: '片上高度集成' },
  { feature: '典型场景', ccd: '高画质专业成像', cmos: '高速、消费级、低功耗' },
] as const;

const cameraParams = [
  { param: '分辨率', desc: '传感器像元总数，决定图像细节' },
  { param: '帧率', desc: '每秒输出图像数（面阵：fps；线阵：lines/s）' },
  { param: '像元深度', desc: '灰度灰阶数：8bit=256级，10bit=1024级，12bit=4096级' },
  { param: '光学接口', desc: 'C 口(17.526mm) / CS 口(12.5mm) / F 口(46.5mm)' },
  { param: '光谱响应', desc: '可见光(400~1000nm) / 红外 / 紫外，按被测物选择' },
] as const;

const lensParams = [
  { param: '焦距', desc: '光学后主点到焦点距离，决定成像大小与视场角', formula: true as const },
  { param: '光圈/相对孔径', desc: '入瞳直径÷焦距；光圈为倒数，影响像面亮度' },
  { param: '视场角', desc: '成像范围张角 FOV，α=2arctan(h/2f)' },
  { param: '工作距离', desc: '镜头到目标之间允许的范围，有限距离清晰成像' },
  { param: '像面尺寸', desc: '能清晰成像的最大范围，遵循"大的兼容小的"' },
  { param: '像质(MTF)', desc: '调制传递函数，衡量成像对比度衰减与"模糊化"程度' },
  { param: '畸变', desc: '成像局部变形：桶形畸变(负) / 枕形畸变(正)' },
  { param: '接口', desc: 'C 口 / CS 口 / F 口，需与摄像机匹配' },
] as const;

const interfaceStandards = [
  { type: '模拟', standard: 'PAL', fps: '25fps, 625线/场', region: '中国、欧洲' },
  { type: '模拟', standard: 'NTSC', fps: '30fps, 525线/场', region: '美、日' },
  { type: '数字', standard: 'CameraLink', fps: '高带宽差分', region: '工业相机' },
  { type: '数字', standard: 'USB 3.0', fps: '即插即用', region: '通用' },
  { type: '数字', standard: 'GigE', fps: '长距离传输', region: '网络相机' },
] as const;

const platforms = [
  {
    title: 'DSP+FPGA',
    core: 'FPGA 控制+预处理，DSP 算法处理',
    advantage: '低延迟、实时性强',
    useCase: '工业视觉前端',
    details: [
      'FPGA 完成滤波、降噪、图像金字塔等预处理加速',
      'DSP 运行核心视觉算法',
      '适合固定场景的实时生产线',
    ],
  },
  {
    title: 'Jetson 嵌入式',
    core: 'GPU+CPU 异构计算',
    advantage: 'AI 算力高、生态完善',
    useCase: '机器人、无人机、智能相机',
    details: [
      'Jetson TX2: 256 CUDA 核 + 8GB LPDDR4',
      'AGX Xavier: 512 CUDA 核 + 16GB LPDDR4x',
      '支持深度学习与视觉算法',
    ],
  },
  {
    title: '计算机方案',
    core: '采集卡 + PC',
    advantage: '开发便捷、OpenCV 生态',
    useCase: '科研、教学、快速原型',
    details: [
      'Windows + VC++ + OpenCV',
      'Linux + Qt + OpenCV',
      '灵活但实时性受限',
    ],
  },
] as const;

const lensSelectionPrinciples = [
  { title: '波长与变焦', desc: '根据被测物材质和观察需求选择合适波段与焦距可调范围' },
  { title: '工作距离与焦距', desc: '现场安装空间限制决定 WD，再通过公式计算所需焦距' },
  { title: '像面大小与像质', desc: '传感器靶面与镜头像面匹配，MTF 曲线满足分辨率要求' },
  { title: '光圈与接口', desc: '按光照条件选光圈大小，按相机接口匹配镜头接口类型' },
] as const;

function BackIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AcquisitionSystemPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-800">
              <BackIcon />
              返回
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <div>
              <h1 className="text-base font-semibold text-slate-900">图像采集处理系统</h1>
              <p className="text-xs text-slate-400">Acquisition System</p>
            </div>
          </div>
          <span className="rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700">
            第一章 / 课程导入
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          {/* 采集处理硬件链路 */}
          <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-indigo-50/70 px-7 py-7">
            <p className="text-xs font-semibold tracking-wide text-indigo-600">硬件链路</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">采集处理硬件链路</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              从光源照明到最终处理设备的完整硬件链路，每个环节都直接影响成像质量与系统性能。
            </p>
          </div>

          {/* Step 2: 系统组成总览 */}
          <div className="p-7">
            <section className="mt-0">
              <p className="text-xs font-semibold tracking-wide text-indigo-600">系统链路</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">系统组成总览</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                典型的图像采集处理系统由六个核心环节构成，形成从物理世界到数字信息的完整通路。
              </p>
              <div className="mt-5 grid grid-cols-3 gap-3 md:grid-cols-6">
                {systemChain.map((item, index) => (
                  <details key={item.title} className="group rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-indigo-200 hover:bg-indigo-50/40">
                    <summary className="cursor-pointer list-none">
                      <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-white text-xs font-bold text-slate-700 shadow-sm">
                        {index + 1}
                      </div>
                      <div className="text-sm font-bold text-slate-900">{item.title}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">{item.desc}</div>
                    </summary>
                    <div className="mt-2 border-t border-slate-200 pt-2 text-xs leading-5 text-slate-500">
                      {index === 0 && '光源类型包括 LED、卤素灯、激光等，需根据被测物材质、颜色和检测需求选择合适波长与照明方式。'}
                      {index === 1 && '目标特性（形状、颜色、材质、运动速度等）直接影响光源、镜头和相机的选型策略。'}
                      {index === 2 && '镜头参数包括焦距、光圈、视场角、工作距离和像面尺寸，决定成像的几何关系与清晰度。'}
                      {index === 3 && '摄像机核心是图像传感器（CCD/CMOS），将光信号转换为电信号，关键参数有分辨率、帧率和灵敏度。'}
                      {index === 4 && '采集卡接收相机信号完成模数转换，并通过 CameraLink、USB 3.0、GigE 等接口将数据传入处理设备。'}
                      {index === 5 && '处理设备运行操作系统与视觉算法库，完成图像预处理、特征提取、目标识别等计算任务。'}
                    </div>
                  </details>
                ))}
              </div>
            </section>

            {/* Step 3: 辅助光源 */}
            <section className="mt-10">
              <p className="text-xs font-semibold tracking-wide text-indigo-600">照明系统</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">辅助光源</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                光源是影响成像质量的关键因素之一，选择合适的照明方式能显著降低后续图像处理难度。
              </p>
              <div className="mt-5 grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-sm font-bold text-slate-900">四大作用</h3>
                  <ul className="mt-4 space-y-3">
                    {lightingRoles.map(role => (
                      <li key={role} className="flex items-start gap-3 text-sm leading-6 text-slate-600">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                        <span>{role}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {lightingTypes.map(type => (
                    <div key={type.title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="text-sm font-bold text-slate-900">{type.title}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">{type.desc}</div>
                      <div className="mt-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-indigo-600">
                        适用：{type.useCase}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Step 4: 摄像机 */}
            <section className="mt-10">
              <p className="text-xs font-semibold tracking-wide text-indigo-600">传感器</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">摄像机</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                摄像机是系统的核心采集部件，负责将光学信号转换为电信号。CCD 和 CMOS 是两种主流传感器技术。
              </p>

              {/* CCD vs CMOS 对比表 */}
              <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100">
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">特性</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">CCD</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">CMOS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {sensorComparison.map(row => (
                      <tr key={row.feature} className="transition hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-700">{row.feature}</td>
                        <td className="px-4 py-3 text-xs leading-5 text-slate-500">{row.ccd}</td>
                        <td className="px-4 py-3 text-xs leading-5 text-slate-500">{row.cmos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Camera parameters */}
              <div className="mt-6">
                <h3 className="text-sm font-bold text-slate-900">核心参数速查</h3>
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100">
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">参数</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">说明</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {cameraParams.map(row => (
                        <tr key={row.param} className="transition hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-700">{row.param}</td>
                          <td className="px-4 py-3 text-xs leading-5 text-slate-500">{row.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Step 5: 镜头 */}
            <section className="mt-10">
              <p className="text-xs font-semibold tracking-wide text-indigo-600">光学系统</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">镜头</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                镜头决定成像的几何关系与光学质量，是连接目标与传感器的桥梁。
              </p>

              {/* Core parameters table */}
              <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100">
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">参数</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">说明</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {lensParams.map(row => (
                      <tr key={row.param} className="transition hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-700">{row.param}</td>
                        <td className="px-4 py-3 text-xs leading-5 text-slate-500">{row.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Focal length formula card */}
              <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="text-sm font-bold text-slate-900">焦距计算公式</h3>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 text-center">
                    <div className="text-lg font-bold text-indigo-700">f = L &middot; h / H</div>
                    <div className="mt-1 text-xs text-slate-400">L: 工作距离 &middot; h: 像面尺寸 &middot; H: 目标尺寸</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 text-xs leading-6 text-slate-600">
                    <p className="font-semibold text-slate-700">算例：</p>
                    <p>
                      已知：1/2&quot; 摄像机（像面 6.4mm×4.8mm），物体 440mm×330mm，工作距离 2500mm
                    </p>
                    <p className="mt-1 font-semibold text-indigo-700">
                      f = 2500 × 6.4 / 440 = 36mm
                    </p>
                  </div>
                </div>
              </div>

              {/* Selection principles */}
              <div className="mt-6">
                <h3 className="text-sm font-bold text-slate-900">选型原则</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {lensSelectionPrinciples.map(item => (
                    <div key={item.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <span className="inline-block rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                        {item.title}
                      </span>
                      <p className="mt-2 text-xs leading-5 text-slate-500">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Step 6: 采集处理平台 */}
            <section className="mt-10">
              <p className="text-xs font-semibold tracking-wide text-indigo-600">处理平台</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">采集处理平台</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                采集处理平台包括接口标准和计算平台选型，决定了系统的数据传输能力和计算性能。
              </p>

              {/* Interface standards table */}
              <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100">
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">类型</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">标准</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">特点</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">应用区域</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {interfaceStandards.map((row, index) => (
                      <tr key={`${row.standard}-${index}`} className="transition hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                            row.type === '模拟' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {row.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-700">{row.standard}</td>
                        <td className="px-4 py-3 text-xs leading-5 text-slate-500">{row.fps}</td>
                        <td className="px-4 py-3 text-xs leading-5 text-slate-500">{row.region}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Platform comparison */}
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {platforms.map(platform => (
                  <details key={platform.title} className="group rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-indigo-200">
                    <summary className="cursor-pointer list-none">
                      <h3 className="text-sm font-bold text-slate-900">{platform.title}</h3>
                      <div className="mt-2 space-y-1 text-xs leading-5 text-slate-500">
                        <p><span className="font-semibold text-slate-600">核心：</span>{platform.core}</p>
                        <p><span className="font-semibold text-slate-600">优势：</span>{platform.advantage}</p>
                        <p><span className="font-semibold text-slate-600">场景：</span>{platform.useCase}</p>
                      </div>
                    </summary>
                    <div className="mt-3 border-t border-slate-200 pt-3">
                      <ul className="space-y-2">
                        {platform.details.map((detail, index) => (
                          <li key={index} className="flex items-start gap-2 text-xs leading-5 text-slate-500">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </details>
                ))}
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
