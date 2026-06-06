import Link from 'next/link';

const concepts = [
  {
    href: '/concepts/convolution',
    title: '卷积',
    titleEn: 'Convolution',
    description: '理解空间滤波的核心：卷积运算原理与实现',
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <path d="M10 6.5h4M6.5 10v4M17.5 10v4M10 17.5h4" strokeLinecap="round" />
      </svg>
    ),
    color: 'from-blue-500 to-indigo-600',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  {
    href: '/concepts/morphology',
    title: '形态学操作',
    titleEn: 'Morphology',
    description: '腐蚀、膨胀、开闭操作与结构元素',
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    color: 'from-emerald-500 to-teal-600',
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-600',
  },
  {
    href: '/concepts/otsu',
    title: 'OTSU 阈值',
    titleEn: 'OTSU Threshold',
    description: '自动阈值分割：直方图双峰与类间方差',
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 3v18h18" />
        <path d="M7 16l4-4 3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: 'from-violet-500 to-purple-600',
    bgLight: 'bg-violet-50',
    textColor: 'text-violet-600',
  },
  {
    href: '/concepts/edge-detection',
    title: '边缘检测',
    titleEn: 'Edge Detection',
    description: 'Sobel 算子与 Canny 边缘检测算法',
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 4h16v16H4z" />
        <path d="M4 12h16M12 4v16" strokeLinecap="round" />
        <path d="M4 4l16 16M20 4L4 20" strokeLinecap="round" />
      </svg>
    ),
    color: 'from-rose-500 to-red-600',
    bgLight: 'bg-rose-50',
    textColor: 'text-rose-600',
  },
  {
    href: '/concepts/blur',
    title: '模糊滤波',
    titleEn: 'Blur Filters',
    description: '均值模糊、高斯模糊与中值滤波',
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="3" />
        <circle cx="12" cy="12" r="6" opacity="0.5" />
        <circle cx="12" cy="12" r="9" opacity="0.3" />
      </svg>
    ),
    color: 'from-cyan-500 to-sky-600',
    bgLight: 'bg-cyan-50',
    textColor: 'text-cyan-600',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Hero Section */}
      <header className="relative overflow-hidden bg-white border-b border-slate-200">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/50" />
        <div className="relative max-w-6xl mx-auto px-8 py-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 mb-6">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-medium text-blue-700 tracking-wide">交互式教学平台</span>
            </div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight leading-tight">
              计算机视觉
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                教学软件
              </span>
            </h1>
            <p className="mt-5 text-lg text-slate-500 leading-relaxed">
              通过可视化交互与实时计算过程，深入理解计算机视觉核心算法原理
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-14">
        {/* Section Title */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-1 h-6 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600" />
          <h2 className="text-lg font-semibold text-slate-800">选择概念开始学习</h2>
          <div className="flex-1 h-px bg-slate-200 ml-4" />
        </div>

        {/* Concept Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {concepts.map(concept => (
            <Link
              key={concept.href}
              href={concept.href}
              className="group relative bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-0.5 overflow-hidden"
            >
              {/* Top accent bar */}
              <div className={`h-1 bg-gradient-to-r ${concept.color}`} />

              <div className="p-7">
                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${concept.bgLight} ${concept.textColor} mb-5 group-hover:scale-105 transition-transform duration-300`}>
                  {concept.icon}
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {concept.title}
                </h3>
                <p className="text-xs font-medium text-slate-400 mt-0.5 tracking-wide uppercase">
                  {concept.titleEn}
                </p>

                {/* Description */}
                <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                  {concept.description}
                </p>

                {/* CTA */}
                <div className="mt-5 flex items-center gap-2 text-sm font-medium text-blue-600">
                  <span>开始学习</span>
                  <svg
                    className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Info Section */}
        <div className="mt-14 bg-white rounded-2xl border border-slate-200/80 p-8">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">使用说明</h3>
              <ul className="mt-3 space-y-2.5 text-sm text-slate-500">
                <li className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5" />
                  <span>每个概念页面包含原图显示、参数设置、计算过程可视化、代码展示</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5" />
                  <span>点击“计算过程”标签查看逐步计算，理解算法每一步的原理</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5" />
                  <span>点击“代码”标签查看 TypeScript 实现，支持多语言切换</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5" />
                  <span>调整参数实时观察结果变化，加深对算法的理解</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <p className="text-xs text-slate-400 text-center">
            CV Teaching Software - 计算机视觉交互式教学平台
          </p>
        </div>
      </footer>
    </div>
  );
}
