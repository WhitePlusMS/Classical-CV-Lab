'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CHAPTER_LABELS, NEXT_CONCEPT_MAP } from '@/components/ConceptLayout';
import { ConceptIntro, CONCEPT_INTRO_CONTENT } from '@/components/teaching';
import { resolveAssetPath } from '@/lib/utils/assetPath';
const taskTypes = [
  { title: '识别', detail: '对象类别' },
  { title: '检测', detail: '目标区域' },
  { title: '定位', detail: '空间位置' },
  { title: '测量', detail: '尺寸距离' },
  { title: '分拣', detail: '自动分类' },
  { title: '跟踪', detail: '运动轨迹' },
] as const;

const applicationFlow = [
  { title: '真实世界图像', detail: '相机、遥感、医学或监控系统采集视觉输入' },
  { title: '图像处理与特征提取', detail: '增强、校正、分割、特征提取和模式分析' },
  { title: '可用信息', detail: '目标、位置、尺寸、类别、轨迹和状态变化' },
  { title: '行业决策', detail: '检测报警、质量控制、导航规划和辅助诊断' },
] as const;

const applicationDomains = [
  {
    title: '工业检测',
    tone: 'border-emerald-200 bg-emerald-50/70 text-emerald-700',
    marker: 'bg-emerald-500',
    input: '生产线相机图像',
    tasks: ['零件检测', '尺寸测量', '瑕疵检测', '自动分拣'],
    challenge: '反光、遮挡、微小缺陷、节拍速度',
    output: '质量判断、缺陷位置、尺寸数据',
  },
  {
    title: '交通监控',
    tone: 'border-sky-200 bg-sky-50/75 text-sky-700',
    marker: 'bg-sky-500',
    input: '路口、路段、停车场视频',
    tasks: ['车辆检测', '身份识别', '行为分析', '违章抓拍'],
    challenge: '视角变化、夜间光照、遮挡、拥堵场景',
    output: '车辆身份、异常事件、通行状态',
  },
  {
    title: '遥感军事',
    tone: 'border-rose-200 bg-rose-50/70 text-rose-700',
    marker: 'bg-rose-500',
    input: '遥感、红外、远距离观测图像',
    tasks: ['弱小目标', '景像匹配', '图像配准', '图像融合'],
    challenge: '目标小、背景复杂、尺度差异、成像噪声',
    output: '目标位置、地貌变化、融合图像',
  },
  {
    title: '无人平台',
    tone: 'border-indigo-200 bg-indigo-50/70 text-indigo-700',
    marker: 'bg-indigo-500',
    input: '车载摄像头、双目视觉、激光雷达',
    tasks: ['车道线检测', '车辆行人检测', '交通标志识别', '障碍物感知'],
    challenge: '实时性、动态目标、三维距离、多传感器融合',
    output: '环境理解、路径判断、运动决策',
  },
  {
    title: '医学/热成像',
    tone: 'border-amber-200 bg-amber-50/75 text-amber-700',
    marker: 'bg-amber-500',
    input: '医学影像、热红外、专用成像设备',
    tasks: ['X 光影像分析', '内窥镜影像分析', '红外测温', '非可见光成像'],
    challenge: '成像噪声、组织边界、温度标定、细节增强',
    output: '结构观察、温度估计、辅助分析',
  },
] as const;

const visualCases = [
  {
    title: '工业外观检测',
    domain: '工业检测',
    imageUrl: '/assets/applications-overview/industrial-vision.jpg',
    imageWidth: 1028,
    imageHeight: 720,
    source: 'Wikimedia / Machine vision',
    sourceHref: 'https://en.wikipedia.org/wiki/Machine_vision',
    alt: '工业机器视觉检测系统现场照片',
    objectPosition: 'center',
    task: '从产品图像中发现缺陷、偏差和异常区域',
    result: '输出合格判定、缺陷位置和尺寸测量结果',
  },
  {
    title: '道路目标检测',
    domain: '交通监控',
    imageUrl: '/assets/applications-overview/traffic-road-camera.jpg',
    imageWidth: 997,
    imageHeight: 1500,
    source: 'Wikimedia / Traffic camera',
    sourceHref: 'https://en.wikipedia.org/wiki/Traffic_camera',
    alt: '道路交通摄像头安装在路口上方',
    objectPosition: 'center 28%',
    task: '从交通视频中定位车辆、行人和道路事件',
    result: '输出车辆数量、位置、身份线索和异常事件',
  },
  {
    title: '自动驾驶感知',
    domain: '无人平台',
    imageUrl: '/assets/applications-overview/autonomous-waymo.jpg',
    imageWidth: 1024,
    imageHeight: 600,
    source: 'Supercar Blondie / Waymo',
    sourceHref: 'https://supercarblondie.com/waymo-one-ride-hail-service-ai/',
    alt: '搭载多类传感器的 Waymo 自动驾驶车辆',
    objectPosition: 'center',
    task: '融合摄像头、激光雷达和定位信息形成环境状态',
    result: '输出车道、车辆、行人、障碍物和可行驶区域',
  },
  {
    title: '热成像测温',
    domain: '医学/热成像',
    imageUrl: '/assets/applications-overview/thermal-fire.jpg',
    imageWidth: 1000,
    imageHeight: 1000,
    source: 'PerfectPrime / Thermal camera',
    sourceHref: 'https://perfectprime.com/blogs/blog/how-a-thermal-camera-can-save-lives',
    alt: '手持热成像相机显示火场温度画面',
    objectPosition: 'center',
    task: '采集热红外波段并把热辐射转换为图像灰度',
    result: '输出温度分布、异常热区和非可见光观察结果',
  },
  {
    title: '遥感图像处理',
    domain: '遥感军事',
    imageUrl: '/assets/applications-overview/remote-landsat.jpg',
    imageWidth: 1024,
    imageHeight: 576,
    source: 'NASA SVS / Landsat 9',
    sourceHref: 'https://svs.gsfc.nasa.gov/13889/',
    alt: '洛杉矶沿海区域的 Landsat 遥感卫星影像',
    objectPosition: 'center',
    task: '对卫星与航空图像进行校正、配准与专题处理',
    result: '输出地物变化、图像融合和目标区域结果',
  },
] as const;

const militaryRemoteCases = [
  {
    title: '红外弱小目标',
    detail: '低对比度目标、复杂背景抑制、噪声与虚警控制',
  },
  {
    title: '景像匹配',
    detail: '预存数字景像图、飞行过程区域相关、偏离航线判定',
  },
  {
    title: '遥感图像处理',
    detail: '辐射校正、几何纠正、投影变换、特征提取',
  },
  {
    title: '图像配准与融合',
    detail: '多时相对齐、多源信息融合、专题图像生成',
  },
] as const;

const industryTrafficItems = [
  {
    title: '工业检测',
    imageUrl: '/assets/applications-overview/industrial-aoi-pcb.jpg',
    imageWidth: 800,
    imageHeight: 450,
    imageAlt: '自动光学检测设备正在检测 PCB 电路板',
    imageLabel: '自动光学检测',
    items: [
      { title: '图像识别', detail: '区分目标类别和对象模式' },
      { title: '图像检测', detail: '发现器件瑕疵和异常区域' },
      { title: '视觉定位', detail: '确认零件位置和姿态' },
      { title: '物体测量', detail: '非接触式尺寸与距离估计' },
      { title: '物体分拣', detail: '按视觉结果完成分类流转' },
    ],
  },
  {
    title: '交通监控',
    imageUrl: '/assets/applications-overview/traffic-speed-camera.jpg',
    imageWidth: 1400,
    imageHeight: 859,
    imageAlt: '道路旁的数字交通监控测速设备',
    imageLabel: '交通监控设备',
    items: [
      { title: '车辆感知', detail: '路口、路段、停车场目标检测' },
      { title: '身份识别', detail: '车牌、人脸、车辆特征比对' },
      { title: '事件分析', detail: '事故、违章、异常行为检测' },
      { title: '辅助驾驶', detail: '车辆、行人、障碍物、道路标识识别' },
      { title: '人体测温', detail: '热红外灰度与温度映射' },
    ],
  },
] as const;

const medicalThermalCases = [
  {
    title: '医学影像',
    detail: 'X 光影像分析、内窥镜影像分析、组织边界增强',
  },
  {
    title: '热红外成像',
    detail: '红外测温、热区定位、非可见光成像',
  },
  {
    title: '辅助分析',
    detail: '噪声抑制、细节增强、异常区域提示',
  },
] as const;

const platformSensors = [
  { title: '摄像头', detail: '车道线、红绿灯、交通标志、行人、车辆' },
  { title: '激光雷达', detail: '目标距离、空间轮廓、障碍物位置' },
  { title: '双目视觉', detail: '视差、深度、三维几何信息' },
  { title: 'IMU', detail: '姿态变化、加速度、角速度' },
  { title: 'GPS/里程计', detail: '平台定位、路径累计、运动约束' },
] as const;

const perceptionPipeline = ['感知', '定位', '检测', '预测', '决策', '规划'] as const;

const keyTechGroups = [
  {
    title: '成像基础',
    hint: '先保证输入可信：标定、畸变和非均匀校正决定后续测量是否可靠。',
    items: ['非均匀性校正', '摄像机畸变校正', '摄像机标定'],
  },
  {
    title: '图像处理',
    hint: '先增强可见证据：灰度、直方图、滤波和边缘为检测提供稳定线索。',
    items: ['灰度化', '直方图', '滤波', '锐化', '边缘检测', '形态学'],
  },
  {
    title: '目标检测',
    hint: '再把证据转成目标判断：颜色、纹理、模板和点匹配分别适合不同目标。',
    items: ['颜色', '纹理', '边缘轮廓', '模板', '点匹配', '分类器'],
  },
  {
    title: '目标跟踪',
    hint: '最后跨帧维持对象身份：搜索和滤波负责把当前目标延续到下一帧。',
    items: ['特征搜索', '卡尔曼滤波 KF', '粒子滤波 PF'],
  },
] as const;

type DetailItem = {
  title: string;
  detail: string;
};

type DetailItemGridProps = {
  items: readonly DetailItem[];
  accentClass: string;
  columnsClass?: string;
  className?: string;
};

function DetailItemGrid({ items, accentClass, columnsClass = 'sm:grid-cols-2', className = 'mt-5' }: DetailItemGridProps) {
  return (
    <div className={`${className} grid gap-3 ${columnsClass}`}>
      {items.map(item => (
        <div key={item.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${accentClass}`} />
            <div>
              <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ApplicationsOverviewPage() {
  const pathname = usePathname();
  const chapterLabel = CHAPTER_LABELS[pathname ?? ''];
  const nextConcept = NEXT_CONCEPT_MAP[pathname ?? ''];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <header className="sticky top-0 z-30 h-14 shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex h-full w-full items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 text-slate-500 transition-colors hover:text-slate-700">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-sm">返回</span>
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-baseline gap-2">
              <h1 className="text-base font-semibold text-slate-900">应用与发展现状</h1>
              <span className="text-xs text-slate-400">Applications & Trends</span>
            </div>
          </div>
          {chapterLabel && (
            <span className="rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700">
              {chapterLabel}
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="px-5 py-5">
            <ConceptIntro {...CONCEPT_INTRO_CONTENT['/concepts/applications-overview']} />
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-cyan-50/70 px-7 py-7">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <p className="text-xs font-semibold tracking-wide text-cyan-700">应用领域</p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">图像处理应用有哪些？</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                  真实场景中的视觉输入经过处理后，形成目标、位置、尺寸、类别和运动线索。
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {taskTypes.map(task => (
                  <div key={task.title} className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                    <div className="text-sm font-bold text-slate-900">{task.title}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{task.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-7">
            <div className="grid gap-4 md:grid-cols-4">
              {applicationFlow.map((step, index) => (
                <div key={step.title} className="relative rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-bold text-slate-700 shadow-sm">
                    {index + 1}
                  </div>
                  <div className="text-sm font-semibold text-slate-900">{step.title}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">{step.detail}</div>
                  {index < applicationFlow.length - 1 ? (
                    <div className="absolute -right-3 top-1/2 hidden text-slate-300 md:block">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mt-10">
              <div className="mb-5">
                <p className="text-xs font-semibold tracking-wide text-slate-500">具体任务</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">图像输入、处理目标、输出结果</h2>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                {visualCases.map(item => (
                  <article key={item.title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                      <Image
                        src={resolveAssetPath(item.imageUrl)}
                        alt={item.alt}
                        width={item.imageWidth}
                        height={item.imageHeight}
                        className="h-full w-full object-cover"
                        style={{ objectPosition: item.objectPosition }}
                        loading="lazy"
                      />
                      <div className="absolute left-4 top-4 rounded-full border border-white/70 bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                        {item.domain}
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                        <a
                          href={item.sourceHref}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-slate-400 transition hover:text-slate-600"
                        >
                          {item.source}
                        </a>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="text-xs font-semibold text-slate-500">处理目标</div>
                          <div className="mt-1 text-sm leading-6 text-slate-700">{item.task}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="text-xs font-semibold text-slate-500">输出结果</div>
                          <div className="mt-1 text-sm leading-6 text-slate-700">{item.result}</div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="mt-10">
              <div className="mb-5">
                <p className="text-xs font-semibold tracking-wide text-slate-500">领域矩阵</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">输入、难点、输出</h2>
              </div>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {applicationDomains.map(domain => (
                  <article key={domain.title} className={`rounded-2xl border p-5 ${domain.tone}`}>
                    <div className="mb-3 flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${domain.marker}`} />
                      <h3 className="text-sm font-bold">{domain.title}</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {domain.tasks.map(task => (
                        <span key={task} className="rounded-md bg-white/75 px-2 py-1 text-[11px] font-medium">
                          {task}
                        </span>
                      ))}
                    </div>
                    <dl className="mt-4 space-y-2 text-xs leading-5">
                      <div>
                        <dt className="font-semibold opacity-70">输入</dt>
                        <dd>{domain.input}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold opacity-70">难点</dt>
                        <dd>{domain.challenge}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold opacity-70">输出</dt>
                        <dd>{domain.output}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-7 shadow-sm">
            <p className="text-xs font-semibold tracking-wide text-rose-600">军事与遥感</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">红外、景像匹配、遥感处理</h2>
            <div className="mt-5 overflow-hidden rounded-2xl border border-rose-100 bg-rose-50/50">
              <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                <Image
                  src={resolveAssetPath('/assets/applications-overview/remote-aster-etna.jpg')}
                  alt="ASTER 遥感传感器生成的埃特纳火山假彩色三维影像"
                  width={1152}
                  height={870}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                <div className="absolute left-4 top-4 rounded-full border border-white/70 bg-white/90 px-3 py-1 text-xs font-semibold text-rose-700 shadow-sm">
                  遥感卫星影像
                </div>
              </div>
              <div className="p-4 text-xs leading-5 text-rose-700/80">
                多光谱与热红外遥感可把地形、植被、水体和热异常转成可分析图像，用于校正、配准、融合和远距离目标检测。
              </div>
            </div>
            <DetailItemGrid items={militaryRemoteCases} accentClass="bg-rose-400" />
          </div>

          {industryTrafficItems.map((group, index) => (
            <div key={group.title} className="rounded-2xl border border-slate-200/80 bg-white p-7 shadow-sm">
              <p className={`text-xs font-semibold tracking-wide ${index === 0 ? 'text-emerald-600' : 'text-sky-600'}`}>
                {group.title}
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                {index === 0 ? '识别、检测、定位、测量、分拣' : '车辆感知、身份识别、事件分析'}
              </h2>
              <div className={`mt-5 overflow-hidden rounded-2xl border ${index === 0 ? 'border-emerald-100 bg-emerald-50/50' : 'border-sky-100 bg-sky-50/50'}`}>
                <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                  <Image
                    src={resolveAssetPath(group.imageUrl)}
                    alt={group.imageAlt}
                    width={group.imageWidth}
                    height={group.imageHeight}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  <div className={`absolute left-4 top-4 rounded-full border border-white/70 bg-white/90 px-3 py-1 text-xs font-semibold shadow-sm ${index === 0 ? 'text-emerald-700' : 'text-sky-700'}`}>
                    {group.imageLabel}
                  </div>
                </div>
              </div>
              <DetailItemGrid items={group.items} accentClass={index === 0 ? 'bg-emerald-400' : 'bg-sky-400'} />
            </div>
          ))}

          <div className="rounded-2xl border border-slate-200/80 bg-white p-7 shadow-sm">
            <p className="text-xs font-semibold tracking-wide text-amber-600">医学/热成像</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">医学影像、红外测温、非可见光成像</h2>
            <div className="mt-5 overflow-hidden rounded-2xl border border-amber-100 bg-amber-50/50">
              <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                <Image
                  src={resolveAssetPath('/assets/applications-overview/medical-thermal-body.jpg')}
                  alt="人体背部热成像图和温度标注"
                  width={760}
                  height={480}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                <div className="absolute left-4 top-4 rounded-full border border-white/70 bg-white/90 px-3 py-1 text-xs font-semibold text-amber-700 shadow-sm">
                  人体热成像
                </div>
              </div>
            </div>
            <DetailItemGrid items={medicalThermalCases} accentClass="bg-amber-400" columnsClass="sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3" />
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200/80 bg-white p-7 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-indigo-600">无人平台感知系统</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">多传感器输入到运动决策</h2>
          <div className="mt-5 overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50/50">
            <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
              <div className="relative min-h-[240px] overflow-hidden bg-slate-100">
                <Image
                  src={resolveAssetPath('/assets/applications-overview/autonomous-cruise-lidar.optimized.jpg')}
                  alt="搭载车顶激光雷达和多传感器的 Cruise 自动驾驶车辆"
                  width={1400}
                  height={788}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                <div className="absolute left-4 top-4 rounded-full border border-white/70 bg-white/90 px-3 py-1 text-xs font-semibold text-indigo-700 shadow-sm">
                  车载传感器平台
                </div>
              </div>
              <div className="flex flex-col justify-center p-5">
                <div className="text-sm font-bold text-slate-900">从车辆外部传感器到环境理解</div>
                <p className="mt-2 text-sm leading-6 text-indigo-800/75">
                  摄像头、激光雷达、惯性测量和定位设备共同采集道路信息，系统再把这些输入转为可用于定位、检测与决策的环境状态。
                </p>
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_auto_1.1fr] lg:items-center">
            <DetailItemGrid items={platformSensors} accentClass="bg-indigo-400" className="" />

            <div className="hidden text-slate-300 lg:block">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                {perceptionPipeline.map((node, index) => (
                  <div key={node} className="relative rounded-xl border border-slate-200 bg-white px-4 py-4 text-center shadow-sm">
                    <div className="mx-auto mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
                      {index + 1}
                    </div>
                    <div className="text-sm font-bold text-slate-900">{node}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500">
                车道线、红绿灯、交通标志、行人、车辆、障碍物和平台姿态共同组成环境状态。
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200/80 bg-white p-7 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-blue-600">关键技术地图</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">从图像采集到目标检测</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {keyTechGroups.map(group => (
              <div key={group.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-bold text-slate-900">{group.title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">{group.hint}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {group.items.map(item => (
                    <span key={item} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {nextConcept && (
          <nav className="mt-8 rounded-xl border border-slate-200 bg-white shadow-sm">
            <Link
              href={nextConcept.href}
              className="group flex items-center justify-between px-6 py-5 transition hover:bg-slate-50"
            >
              <div>
                <div className="text-[11px] font-medium text-slate-400">下一节</div>
                <div className="mt-0.5 text-sm font-semibold text-slate-800 group-hover:text-blue-700">
                  {nextConcept.title}
                </div>
              </div>
              <svg
                className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </nav>
        )}
      </main>
    </div>
  );
}
