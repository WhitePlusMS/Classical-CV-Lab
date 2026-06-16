(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,43082,e=>{"use strict";var m=e.i(71645);function t(e,m,t){switch(t){case"up":return{x:e.x,y:Math.max(0,e.y-1)};case"down":return{x:e.x,y:Math.min(m.height-1,e.y+1)};case"left":return{x:Math.max(0,e.x-1),y:e.y};case"right":return{x:Math.min(m.width-1,e.x+1),y:e.y}}}e.s(["moveGridPoint",0,t,"useGridNavigation",0,function({current:e,bounds:a,onMove:o,disabled:i=!1}){return(0,m.useCallback)(m=>{i||!e||a.width<=0||a.height<=0||o(t(e,a,m))},[a.height,a.width,e,i,o])}])},34928,e=>{"use strict";var m=e.i(12392);function t(e,m,a=0){let o=(31*a+17*e+53*m)%0x7fffffff;return((o=16807*(o=16807*o%0x7fffffff)%0x7fffffff)>>>0)/0x100000000}function a(){let e=(0,m.create2DArray)(64,64,0);for(let m=0;m<64;m++)for(let a=0;a<64;a++){let o=a/64,i=m/64,l=Math.sqrt((o-.5)**2+(i-.5)**2),s=.5+.3*Math.sin(o*Math.PI*4)*Math.cos(i*Math.PI*4);l<.15?s=.2+.1*t(a,m,1):l<.25?s=.8:l<.35&&(s=.3+.4*(.5*Math.sin(3*Math.atan2(i-.5,o-.5))+.5)),e[m][a]=Math.max(0,Math.min(1,s+(t(a,m,2)-.5)*.1))}return e}function o(e=22,t=32,a=32){let i=(0,m.create2DArray)(64,64,0);for(let m=0;m<64;m++)for(let o=0;o<64;o++){let l=Math.sqrt((o-t)**2+(m-a)**2);l<e?i[m][o]=.9:l<e+5?i[m][o]=.3:i[m][o]=.1}return i}function i(e=12,t=12,a=48,o=48){let l=(0,m.create2DArray)(64,64,0);for(let m=0;m<64;m++)for(let i=0;i<64;i++)i>=e&&i<=a&&m>=t&&m<=o?i<e+5||i>a-5||m<t+5||m>o-5?l[m][i]=.3:l[m][i]=.85:l[m][i]=.15;return l}let l={lena:{name:"Lena",image:a()},gradient:{name:"渐变",image:function(){let e=(0,m.create2DArray)(64,64,0);for(let m=0;m<64;m++)for(let t=0;t<64;t++)e[m][t]=(t+m)/128;return e}()},checkerboard:{name:"棋盘",image:function(e=8,t=8){let a=e*t,o=e*t,i=(0,m.create2DArray)(a,o,0);for(let e=0;e<a;e++)for(let m=0;m<o;m++){let a=Math.floor(m/t)%2,o=Math.floor(e/t)%2;i[e][m]=(a+o)%2==0?.2:.8}return i}()},circle:{name:"圆形",image:o()},rectangle:{name:"矩形",image:i()},binary:{name:"二值图",image:function(){let e=(0,m.create2DArray)(64,64,0);for(let m=0;m<64;m++)for(let a=0;a<64;a++)e[m][a]=0,10>Math.sqrt((a-20)**2+(m-20)**2)&&(e[m][a]=1),8>Math.sqrt((a-45)**2+(m-45)**2)&&(e[m][a]=1),a>30&&a<50&&m>10&&m<25&&(e[m][a]=1),.02>t(a,m,3)&&(e[m][a]=+(t(a,m,4)>.5));return e}()}};e.s(["createCircleImage",0,o,"createLenaImage",0,a,"createRectangleImage",0,i,"createReferenceImage",0,function(e,t){switch(t){case"rectangle":return{image:o(),label:"圆形参考图"};case"circle":return{image:i(),label:"矩形参考图"};case"lenaOriginal":return{image:function(e,t=15,a=.9){let o=e.length,i=e[0]?.length??0;if(0===o||0===i)return e;let l=(0,m.create2DArray)(o,i,0),s=t*Math.PI/180,n=Math.cos(s),r=Math.sin(s),d=i/2,x=o/2;for(let m=0;m<o;m++)for(let t=0;t<i;t++){let s=t-d,c=m-x,h=Math.round((n*s+r*c)/a+d),u=Math.round((-r*s+n*c)/a+x);h>=0&&h<i&&u>=0&&u<o?l[m][t]=e[u][h]:l[m][t]=0}return l}(e,15,.9),label:"旋转缩放参考图（15°, 0.9×）"}}},"sampleImages",0,l])},34500,e=>{"use strict";var m=e.i(43476),t=e.i(71645);e.i(33999);var a=e.i(75345),o=e.i(13870),i=e.i(54712),l=e.i(85255),s=e.i(27981),n=e.i(96891),r=e.i(12392);let d=[[0,-1,0],[-1,5,-1],[0,-1,0]];var x=e.i(34928),c=e.i(43082);let h=`function gradientSharpen(image: number[][], method: 'max' | 'sum'): number[][] {
  const height = image.length;
  const width = image[0].length;
  const result = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // 一阶差分：水平和垂直方向
      const fiDiff = image[y][clamp(x + 1, 0, width - 1)] - image[y][x];
      const fjDiff = image[clamp(y + 1, 0, height - 1)][x] - image[y][x];

      const absFi = Math.abs(fiDiff);
      const absFj = Math.abs(fjDiff);

      // 梯度幅值近似
      const grad = method === 'max'
        ? Math.max(absFi, absFj)
        : absFi + absFj;

      // 截断到有效范围
      result[y][x] = clamp(grad, 0, 1);
    }
  }
  return result;
}`,u=`function laplaceEnhance(image: number[][]): number[][] {
  const height = image.length;
  const width = image[0].length;
  const result = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // 四邻域像素
      const top = image[clamp(y - 1, 0, height - 1)][x];
      const bottom = image[clamp(y + 1, 0, height - 1)][x];
      const left = image[y][clamp(x - 1, 0, width - 1)];
      const right = image[y][clamp(x + 1, 0, width - 1)];
      const center = image[y][x];

      // Laplace 二阶差分
      const laplacian = bottom + top + right + left - 4 * center;

      // 增强：g = f - ∇\xb2f，截断到 [0, 1]
      result[y][x] = clamp(center - laplacian, 0, 1);
    }
  }
  return result;
}`,b=[{value:"gradient",label:"梯度锐化"},{value:"laplace",label:"Laplace 增强"}],f=[{value:"max",label:"max(|fᵢ′|, |fⱼ′|)"},{value:"sum",label:"|fᵢ′| + |fⱼ′|"}];function g({mathML:e,className:t="",mathClassName:a="[&_math]:text-[0.92rem]"}){return(0,m.jsx)("div",{className:`leading-7 ${t}`,children:(0,m.jsx)(l.MathText,{mathML:e,className:`[&_math]:inline-block ${a}`})})}function p({mathML:e,className:t=""}){return(0,m.jsx)(l.MathText,{mathML:e,className:`align-middle [&_math]:inline-block [&_math]:text-[0.82rem] ${t}`})}function M(e,m){return`<mi>f</mi><mo>(</mo><mn>${e}</mn><mo>,</mo><mn>${m}</mn><mo>)</mo>`}function j(e){return`<mn>${e}</mn>`}function w(e){return"max"===e?`
      <mi>max</mi><mo>(</mo>
      <mo>|</mo><msub><mi>f</mi><mi>i</mi></msub><mo>′</mo><mo>|</mo>
      <mo>,</mo>
      <mo>|</mo><msub><mi>f</mi><mi>j</mi></msub><mo>′</mo><mo>|</mo>
      <mo>)</mo>
    `:`
    <mo>|</mo><msub><mi>f</mi><mi>i</mi></msub><mo>′</mo><mo>|</mo>
    <mo>+</mo>
    <mo>|</mo><msub><mi>f</mi><mi>j</mi></msub><mo>′</mo><mo>|</mo>
  `}function N(e,m,t,a){return(0,l.buildInlineMathML)(`
    <mrow>
      <msub><mi>${e}</mi><mtext>8-bit</mtext></msub>
      <mo>(</mo><mn>${m}</mn><mo>,</mo><mn>${t}</mn><mo>)</mo>
      <mo>=</mo><mi>round</mi><mo>(</mo><mn>255</mn><mo>\xd7</mo>${j(a.toFixed(4))}<mo>)</mo>
      <mo>=</mo>${j(Math.round(255*Math.max(0,Math.min(1,a))))}
    </mrow>
  `)}e.s(["default",0,function(){let[e,y]=(0,t.useState)("lena"),[v,L]=(0,t.useState)("gradient"),[$,F]=(0,t.useState)("max"),[I,C]=(0,t.useState)(0),[D,S]=(0,t.useState)(null);(0,t.useEffect)(()=>{let e=!1;return(0,r.loadImageAsGrayscale)("/assets/lena-original.jpg").then(m=>{e||S((0,r.resizeGrayscaleImage)((0,r.centerCropGrayscaleImage)(m),96))}).catch(()=>{e||S(null)}),()=>{e=!0}},[]);let V=(0,t.useMemo)(()=>"lena"===e&&D?D:x.sampleImages[e].image,[e,D]),A=V[0]?.length??0,R=V.length,T=(0,t.useMemo)(()=>"gradient"===v?function(e,m="max"){let t=e.length,a=e[0]?.length||0,o=(0,r.create2DArray)(t,a,0);for(let i=0;i<t;i++)for(let l=0;l<a;l++){let s=(0,r.clamp)(l+1,0,a-1),n=e[i][s]-e[i][l],d=e[(0,r.clamp)(i+1,0,t-1)][l]-e[i][l],x=Math.abs(n),c=Math.abs(d),h="max"===m?Math.max(x,c):x+c;o[i][l]=(0,r.clamp)(h,0,1)}return o}(V,$):function(e){let m=e.length,t=e[0]?.length||0,a=(0,r.create2DArray)(m,t,0);for(let o=0;o<m;o++)for(let i=0;i<t;i++){let l=(0,r.clamp)(o-1,0,m-1),s=(0,r.clamp)(o+1,0,m-1),n=(0,r.clamp)(i-1,0,t-1),d=(0,r.clamp)(i+1,0,t-1),x=e[s][i]+e[l][i]+e[o][d]+e[o][n]-4*e[o][i],c=e[o][i]-x;a[o][i]=(0,r.clamp)(c,0,1)}return a}(V),[V,v,$]),P=(0,t.useMemo)(()=>"gradient"===v?Array.from(function*(e,m="max"){if(!e||0===e.length||!e[0])return;let t=e.length,a=e[0].length;for(let o=0;o<t;o++)for(let i=0;i<a;i++){let l=[];for(let m=-1;m<=1;m++){let s=[];for(let l=-1;l<=1;l++){let n=(0,r.clamp)(o+m,0,t-1),d=(0,r.clamp)(i+l,0,a-1);s.push(e[n][d])}l.push(s)}let s=(0,r.clamp)(i+1,0,a-1),n=(0,r.clamp)(o+1,0,t-1),d=e[o][s]-e[o][i],x=e[n][i]-e[o][i],c=Math.abs(d),h=Math.abs(x),u="max"===m?Math.max(c,h):c+h;yield{x:i,y:o,inputRegion:l,fiDiff:d,fjDiff:x,gradientMag:u,outputValue:(0,r.clamp)(u,0,1),method:m}}}(V,$)):Array.from(function*(e){if(!e||0===e.length||!e[0])return;let m=e.length,t=e[0].length;for(let a=0;a<m;a++)for(let o=0;o<t;o++){let i=[];for(let l=-1;l<=1;l++){let s=[];for(let i=-1;i<=1;i++){let n=(0,r.clamp)(a+l,0,m-1),d=(0,r.clamp)(o+i,0,t-1);s.push(e[n][d])}i.push(s)}let l=(0,r.clamp)(a-1,0,m-1),s=(0,r.clamp)(a+1,0,m-1),n=(0,r.clamp)(o-1,0,t-1),d=(0,r.clamp)(o+1,0,t-1),x=e[l][o],c=e[s][o],h=e[a][n],u=e[a][d],b=e[a][o],f=c+x+u+h-4*b,g=b-f;yield{x:o,y:a,inputRegion:i,centerValue:b,laplacian:f,neighbors:{top:x,bottom:c,left:h,right:u},outputValue:(0,r.clamp)(g,0,1)}}}(V)),[V,v,$]),k=P[I]??null,G=(0,c.useGridNavigation)({current:k?{x:k.x,y:k.y}:null,bounds:{width:A,height:R},onMove:(0,t.useCallback)(e=>{let m=P.findIndex(m=>m.x===e.x&&m.y===e.y);-1!==m&&C(m)},[P]),disabled:0===P.length}),_=(0,t.useCallback)((e,m)=>{let t=P.findIndex(t=>t.x===e&&t.y===m);-1!==t&&C(t)},[P]),O=(0,t.useCallback)((e,m)=>{let t=P.findIndex(t=>t.x===e&&t.y===m);-1!==t&&C(t)},[P]),q=(0,t.useMemo)(()=>k?"lena"===e||A<3||R<3?{x:k.x,y:k.y,kernelSize:1}:{x:k.x,y:k.y,kernelSize:3,regionX:Math.max(0,Math.min(k.x-1,A-3)),regionY:Math.max(0,Math.min(k.y-1,R-3))}:null,[k,R,e,A]),z=(0,m.jsxs)("div",{className:"space-y-4",children:[(0,m.jsx)(s.SelectParam,{label:"教学示例",value:e,onChange:e=>{y(e),C(0)},options:Object.entries(x.sampleImages).map(([e,{name:m}])=>({value:e,label:m}))}),(0,m.jsx)(s.SelectParam,{label:"锐化方法",value:v,onChange:e=>{L(e),C(0)},options:b}),"gradient"===v&&(0,m.jsx)(s.SelectParam,{label:"梯度合成方式",value:$,onChange:e=>{F(e),C(0)},options:f})]}),B=(0,t.useMemo)(()=>{if(!k)return(0,m.jsx)(i.ProcessRail,{children:(0,m.jsx)("div",{className:"text-center text-slate-400 py-4 text-sm",children:"点击原图或结果图，或使用方向键选择像素查看锐化过程"})});let{x:e,y:t}=k;if("gradient"===v){let a=Math.min(e+1,A-1),o=Math.min(t+1,R-1),s=(0,l.buildInlineMathML)(`
        <mrow>
          <msub><mi>f</mi><mi>i</mi></msub><mo>′</mo>
          <mo>=</mo>${M(a,t)}<mo>-</mo>${M(e,t)}
          <mo>=</mo>${j(k.fiDiff.toFixed(4))}
        </mrow>
      `),n=(0,l.buildInlineMathML)(`
        <mrow>
          <msub><mi>f</mi><mi>j</mi></msub><mo>′</mo>
          <mo>=</mo>${M(e,o)}<mo>-</mo>${M(e,t)}
          <mo>=</mo>${j(k.fjDiff.toFixed(4))}
        </mrow>
      `),r=(0,l.buildInlineMathML)(`
        <mrow>
          <mi>grad</mi><mo>=</mo>${w($)}
          <mo>=</mo>${j(k.gradientMag.toFixed(4))}
        </mrow>
      `),d=N("output",e,t,k.outputValue);return(0,m.jsx)(i.ProcessRail,{children:(0,m.jsxs)(i.FlowColumns,{children:[(0,m.jsx)(i.FlowColumn,{align:"start",children:(0,m.jsxs)(i.FlowNode,{tone:"red",children:[(0,m.jsxs)("div",{className:"text-xs font-semibold text-red-700 mb-1",children:["当前像素 (",e,", ",t,")"]}),(0,m.jsxs)("div",{className:"text-[11px] text-slate-600",children:["邻域 3×3，中心值 = ",k.inputRegion[1]?.[1]?.toFixed(3)??"-"]})]})}),(0,m.jsx)(i.FlowColumn,{align:"center",children:(0,m.jsxs)(i.FlowNode,{tone:"amber",children:[(0,m.jsx)("div",{className:"text-xs font-semibold text-amber-700 mb-1",children:"梯度差分"}),(0,m.jsxs)("div",{className:"space-y-0.5 text-slate-600",children:[(0,m.jsx)(g,{mathML:s}),(0,m.jsx)(g,{mathML:n}),(0,m.jsx)(g,{mathML:r,className:"mt-1 font-semibold text-amber-700"})]})]})}),(0,m.jsx)(i.FlowColumn,{align:"end",children:(0,m.jsxs)(i.FlowNode,{tone:"emerald",children:[(0,m.jsxs)("div",{className:"text-xs font-semibold text-emerald-700 mb-1",children:["输出像素 (",e,", ",t,")"]}),(0,m.jsx)("div",{className:"text-lg font-bold text-emerald-700",children:k.outputValue.toFixed(4)}),(0,m.jsx)(g,{mathML:d,className:"mt-0.5 font-semibold text-emerald-700",mathClassName:"[&_math]:text-[0.68rem]"}),(0,m.jsx)("div",{className:"text-[10px] text-slate-500 mt-0.5",children:"内部为归一化灰度，显示为 8-bit 时裁剪到 0 到 255"})]})})]})})}let a=(0,l.buildInlineMathML)(`
      <mrow>
        <msup><mo>∇</mo><mn>2</mn></msup><mi>f</mi>
        <mo>=</mo>${j(k.neighbors.bottom.toFixed(3))}
        <mo>+</mo>${j(k.neighbors.top.toFixed(3))}
        <mo>+</mo>${j(k.neighbors.right.toFixed(3))}
        <mo>+</mo>${j(k.neighbors.left.toFixed(3))}
        <mo>-</mo><mn>4</mn><mo>\xd7</mo>${j(k.centerValue.toFixed(3))}
      </mrow>
    `),o=(0,l.buildInlineMathML)(`
      <mrow>
        <msup><mo>∇</mo><mn>2</mn></msup><mi>f</mi>
        <mo>=</mo>${j(k.laplacian.toFixed(4))}
      </mrow>
    `),s=(0,l.buildInlineMathML)(`
      <mrow>
        <mi>g</mi><mo>=</mo><mi>f</mi><mo>-</mo><msup><mo>∇</mo><mn>2</mn></msup><mi>f</mi>
        <mo>=</mo>${j(k.centerValue.toFixed(3))}
        <mo>-</mo><mo>(</mo>${j(k.laplacian.toFixed(3))}<mo>)</mo>
      </mrow>
    `),n=N("g",e,t,k.outputValue);return(0,m.jsx)(i.ProcessRail,{children:(0,m.jsxs)(i.FlowColumns,{children:[(0,m.jsx)(i.FlowColumn,{align:"start",children:(0,m.jsxs)(i.FlowNode,{tone:"red",children:[(0,m.jsxs)("div",{className:"text-xs font-semibold text-red-700 mb-1",children:["当前像素 (",e,", ",t,")"]}),(0,m.jsxs)("div",{className:"text-[11px] text-slate-600",children:["中心值 = ",k.centerValue.toFixed(4)]})]})}),(0,m.jsx)(i.FlowColumn,{align:"center",children:(0,m.jsxs)(i.FlowNode,{tone:"amber",children:[(0,m.jsx)("div",{className:"text-xs font-semibold text-amber-700 mb-1",children:"Laplace 二阶差分"}),(0,m.jsxs)("div",{className:"space-y-0.5 text-slate-600",children:[(0,m.jsx)(g,{mathML:a}),(0,m.jsx)(g,{mathML:o,className:"font-semibold text-amber-700"})]})]})}),(0,m.jsx)(i.FlowColumn,{align:"end",children:(0,m.jsxs)(i.FlowNode,{tone:"emerald",children:[(0,m.jsxs)("div",{className:"text-xs font-semibold text-emerald-700 mb-1",children:["增强输出 (",e,", ",t,")"]}),(0,m.jsx)(g,{mathML:s,className:"text-slate-600"}),(0,m.jsx)("div",{className:"text-lg font-bold text-emerald-700 mt-1",children:k.outputValue.toFixed(4)}),(0,m.jsx)(g,{mathML:n,className:"mt-0.5 font-semibold text-emerald-700",mathClassName:"[&_math]:text-[0.68rem]"}),(0,m.jsx)("div",{className:"text-[10px] text-slate-500 mt-0.5",children:"内部为归一化灰度，显示为 8-bit 时裁剪到 0 到 255"})]})})]})})},[k,v,$,R,A]),E=(0,t.useMemo)(()=>{if(!k)return(0,m.jsx)("div",{className:"text-center text-slate-400 py-8 text-sm",children:"选择图像中的一个像素以查看锐化计算过程"});let{x:e,y:t}=k,a=(0,m.jsxs)(n.TeachingCard,{children:[(0,m.jsx)("div",{className:"text-sm font-semibold text-slate-800 mb-2",children:"一阶梯度锐化与 Laplace 增强的区别"}),(0,m.jsxs)("div",{className:"grid gap-3 text-xs leading-6 text-slate-600 md:grid-cols-2",children:[(0,m.jsxs)("div",{className:"rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2",children:[(0,m.jsx)("div",{className:"font-semibold text-amber-700",children:"一阶梯度锐化"}),(0,m.jsx)("p",{className:"mt-1",children:"直接度量相邻像素的灰度变化，输出更接近“边缘强度图”。它能突出突变位置，但平坦区域通常接近 0。"})]}),(0,m.jsxs)("div",{className:"rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2",children:[(0,m.jsx)("div",{className:"font-semibold text-emerald-700",children:"Laplace 增强"}),(0,m.jsx)("p",{className:"mt-1",children:"先计算二阶差分，再回写到原图上增强反差，因此更接近“锐化后的图像”。它对边缘和噪声都会更敏感。"})]})]})]});if("gradient"===v){let o=(0,l.buildInlineMathML)(`
        <mrow>
          <mi>grad</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo>
          <mo>=</mo>${w($)}
        </mrow>
      `),i=Math.min(e+1,A-1),s=Math.min(t+1,R-1),r=(0,l.buildInlineMathML)(`
        <mrow>
          <msub><mi>f</mi><mi>i</mi></msub><mo>′</mo>
          <mo>=</mo>${M(i,t)}<mo>-</mo>${M(e,t)}
          <mo>=</mo>${j(k.inputRegion[1][2].toFixed(4))}
          <mo>-</mo>${j(k.inputRegion[1][1].toFixed(4))}
          <mo>=</mo>${j(k.fiDiff.toFixed(4))}
        </mrow>
      `),d=(0,l.buildInlineMathML)(`
        <mrow>
          <msub><mi>f</mi><mi>j</mi></msub><mo>′</mo>
          <mo>=</mo>${M(e,s)}<mo>-</mo>${M(e,t)}
          <mo>=</mo>${j(k.inputRegion[2][1].toFixed(4))}
          <mo>-</mo>${j(k.inputRegion[1][1].toFixed(4))}
          <mo>=</mo>${j(k.fjDiff.toFixed(4))}
        </mrow>
      `),x=(0,l.buildInlineMathML)(`
        <mrow>
          <mo>|</mo><msub><mi>f</mi><mi>i</mi></msub><mo>′</mo><mo>|</mo>
          <mo>=</mo>${j(Math.abs(k.fiDiff).toFixed(4))}
          <mo>,</mo>
          <mo>|</mo><msub><mi>f</mi><mi>j</mi></msub><mo>′</mo><mo>|</mo>
          <mo>=</mo>${j(Math.abs(k.fjDiff).toFixed(4))}
        </mrow>
      `),c=(0,l.buildInlineMathML)(`
        <mrow>
          <mi>grad</mi><mo>=</mo>${w($)}
          <mo>=</mo>${j(k.gradientMag.toFixed(4))}
        </mrow>
      `),h=(0,l.buildInlineMathML)(`
        <mrow>
          <mi>output</mi><mo>(</mo><mn>${e}</mn><mo>,</mo><mn>${t}</mn><mo>)</mo>
          <mo>=</mo>${j(k.outputValue.toFixed(4))}
        </mrow>
      `),u=N("output",e,t,k.outputValue);return(0,m.jsxs)("div",{className:"space-y-4",children:[(0,m.jsx)(l.FormulaCard,{label:"一阶梯度锐化公式",mathML:o,note:"梯度表示图像在行列方向上的灰度变化率。在离散图像中，偏导数用一阶差分近似。"}),(0,m.jsxs)(n.TeachingCard,{children:[(0,m.jsxs)("div",{className:"text-sm font-semibold text-slate-800 mb-3",children:["当前像素 (",e,", ",t,") 代入计算"]}),(0,m.jsxs)("div",{className:"space-y-3",children:[(0,m.jsxs)("div",{children:[(0,m.jsx)("div",{className:"text-xs text-slate-500 mb-1.5",children:"3×3 邻域矩阵"}),(0,m.jsx)("div",{className:"inline-grid gap-[2px] bg-slate-200 p-[2px] rounded-lg",style:{gridTemplateColumns:"repeat(3, minmax(0, 1fr))"},children:k.inputRegion.map((e,t)=>e.map((e,a)=>{let o="bg-white text-slate-600";return 1===t&&1===a?o="bg-red-50 border border-red-300 text-red-700 font-semibold":(1===t&&2===a||2===t&&1===a)&&(o="bg-amber-50 border border-amber-200 text-amber-700"),(0,m.jsx)("div",{className:`w-12 h-10 flex items-center justify-center text-[10px] font-mono rounded ${o}`,children:e.toFixed(3)},`${t}-${a}`)}))}),(0,m.jsxs)("div",{className:"text-[10px] text-slate-500 mt-1",children:["红色 = 当前像素"," ",(0,m.jsx)(p,{mathML:(0,l.buildInlineMathML)(`<mrow>${M(e,t)}</mrow>`)}),"，黄色 = 差分计算用邻域像素"]})]}),(0,m.jsxs)("div",{children:[(0,m.jsx)("div",{className:"text-xs text-slate-500 mb-1.5",children:"一阶差分计算"}),(0,m.jsxs)("div",{className:"bg-[#f8f7f3] rounded-xl border border-slate-200 px-4 py-3 space-y-2 text-sm",children:[(0,m.jsx)(g,{mathML:r,className:"text-slate-600"}),(0,m.jsx)(g,{mathML:d,className:"text-slate-600"})]})]}),(0,m.jsxs)("div",{children:[(0,m.jsx)("div",{className:"text-xs text-slate-500 mb-1.5",children:"梯度幅值合成"}),(0,m.jsxs)("div",{className:"bg-[#f8f7f3] rounded-xl border border-slate-200 px-4 py-3",children:[(0,m.jsx)(g,{mathML:x,className:"text-slate-600"}),(0,m.jsx)(g,{mathML:c,className:"mt-1 font-semibold text-emerald-700"})]})]}),(0,m.jsxs)("div",{className:"bg-emerald-50 rounded-xl border border-emerald-200 px-4 py-3",children:[(0,m.jsx)(g,{mathML:h,className:"font-semibold text-emerald-700"}),(0,m.jsx)(g,{mathML:u,className:"font-semibold text-emerald-700"}),(0,m.jsx)("div",{className:"text-[10px] text-slate-500 mt-1",children:"梯度值越大说明该位置灰度变化越剧烈（边缘越明显）。计算过程使用归一化灰度；按 8-bit 显示时必须裁剪到 0 到 255。"})]})]})]}),a]})}let o=Math.max(t-1,0),i=Math.min(t+1,R-1),s=Math.max(e-1,0),r=Math.min(e+1,A-1),x=(0,l.buildInlineMathML)(`
      <mrow>
        <msup><mo>∇</mo><mn>2</mn></msup><mi>f</mi>
        <mo>=</mo>${M(e,i)}
        <mo>+</mo>${M(e,o)}
        <mo>+</mo>${M(r,t)}
        <mo>+</mo>${M(s,t)}
        <mo>-</mo><mn>4</mn><mo>\xb7</mo>${M(e,t)}
      </mrow>
    `),c=(0,l.buildInlineMathML)(`
      <mrow>
        <mo>=</mo>${j(k.neighbors.bottom.toFixed(4))}
        <mo>+</mo>${j(k.neighbors.top.toFixed(4))}
        <mo>+</mo>${j(k.neighbors.right.toFixed(4))}
        <mo>+</mo>${j(k.neighbors.left.toFixed(4))}
        <mo>-</mo><mn>4</mn><mo>\xd7</mo>${j(k.centerValue.toFixed(4))}
      </mrow>
    `),h=(0,l.buildInlineMathML)(`
      <mrow>
        <mo>=</mo>${j(k.laplacian.toFixed(4))}
      </mrow>
    `),u=(0,l.buildInlineMathML)(`
      <mrow>
        <mi>g</mi><mo>(</mo><mn>${e}</mn><mo>,</mo><mn>${t}</mn><mo>)</mo>
        <mo>=</mo>${M(e,t)}
        <mo>-</mo><msup><mo>∇</mo><mn>2</mn></msup><mi>f</mi>
        <mo>=</mo>${j(k.centerValue.toFixed(4))}
        <mo>-</mo><mo>(</mo>${j(k.laplacian.toFixed(4))}<mo>)</mo>
      </mrow>
    `),b=(0,l.buildInlineMathML)(`
      <mrow>
        <mo>=</mo>${j(k.outputValue.toFixed(4))}
      </mrow>
    `),f=N("g",e,t,k.outputValue),y=(0,l.buildInlineMathML)(`
      <mrow>
        <mi>center</mi><mo>=</mo><mn>1</mn><mo>-</mo><mo>(</mo><mo>-</mo><mn>4</mn><mo>)</mo><mo>=</mo><mn>5</mn>
      </mrow>
    `),L=(0,l.buildInlineMathML)(`
      <mrow>
        <msup><mo>∇</mo><mn>2</mn></msup><mi>f</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo>
        <mo>=</mo><mi>f</mi><mo>(</mo><mi>i</mi><mo>+</mo><mn>1</mn><mo>,</mo><mi>j</mi><mo>)</mo>
        <mo>+</mo><mi>f</mi><mo>(</mo><mi>i</mi><mo>-</mo><mn>1</mn><mo>,</mo><mi>j</mi><mo>)</mo>
        <mo>+</mo><mi>f</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>+</mo><mn>1</mn><mo>)</mo>
        <mo>+</mo><mi>f</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>-</mo><mn>1</mn><mo>)</mo>
        <mo>-</mo><mn>4</mn><mi>f</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo>
      </mrow>
    `),F=(0,l.buildInlineMathML)(`
      <mrow>
        <mi>g</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo>
        <mo>=</mo><mi>f</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo>
        <mo>-</mo><msup><mo>∇</mo><mn>2</mn></msup><mi>f</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo>
      </mrow>
    `);return(0,m.jsxs)("div",{className:"space-y-4",children:[(0,m.jsx)(l.FormulaCard,{label:"Laplace 二阶微分算子",mathML:L,note:"Laplace 算子是线性二阶微分算子，对离散图像用二阶差分近似。它对灰度突变区域（边缘）响应强烈。"}),(0,m.jsx)(l.FormulaCard,{label:"Laplace 增强",mathML:F,note:"从原图减去 Laplace 值（负的拉普拉斯），使边缘区域的灰度反差增大，达到锐化效果。"}),(0,m.jsxs)(n.TeachingCard,{children:[(0,m.jsxs)("div",{className:"text-sm font-semibold text-slate-800 mb-3",children:["当前像素 (",e,", ",t,") 代入计算"]}),(0,m.jsxs)("div",{className:"space-y-3",children:[(0,m.jsxs)("div",{children:[(0,m.jsx)("div",{className:"text-xs text-slate-500 mb-1.5",children:"3×3 邻域矩阵"}),(0,m.jsx)("div",{className:"inline-grid gap-[2px] bg-slate-200 p-[2px] rounded-lg",style:{gridTemplateColumns:"repeat(3, minmax(0, 1fr))"},children:k.inputRegion.map((e,t)=>e.map((e,a)=>{let o="bg-white text-slate-600";return 1===t&&1===a?o="bg-red-50 border border-red-300 text-red-700 font-semibold":(0===t&&1===a||2===t&&1===a||1===t&&0===a||1===t&&2===a)&&(o="bg-amber-50 border border-amber-200 text-amber-700"),(0,m.jsx)("div",{className:`w-12 h-10 flex items-center justify-center text-[10px] font-mono rounded ${o}`,children:e.toFixed(3)},`${t}-${a}`)}))}),(0,m.jsxs)("div",{className:"text-[10px] text-slate-500 mt-1",children:["红色 = ",(0,m.jsx)(p,{mathML:(0,l.buildInlineMathML)(`<mrow>${M(e,t)}</mrow>`)}),"，黄色 = 四邻域"," ",(0,m.jsx)(p,{mathML:(0,l.buildInlineMathML)(`<mrow>${M(e,o)}</mrow>`)}),"、",(0,m.jsx)(p,{mathML:(0,l.buildInlineMathML)(`<mrow>${M(e,i)}</mrow>`)}),"、",(0,m.jsx)(p,{mathML:(0,l.buildInlineMathML)(`<mrow>${M(s,t)}</mrow>`)}),"、",(0,m.jsx)(p,{mathML:(0,l.buildInlineMathML)(`<mrow>${M(r,t)}</mrow>`)})]})]}),(0,m.jsxs)("div",{children:[(0,m.jsx)("div",{className:"text-xs text-slate-500 mb-1.5",children:"Laplace 二阶差分计算"}),(0,m.jsx)("div",{className:"bg-[#f8f7f3] rounded-xl border border-slate-200 px-4 py-3",children:(0,m.jsxs)("div",{className:"text-sm text-slate-600 space-y-1",children:[(0,m.jsx)(g,{mathML:x,className:"text-slate-600"}),(0,m.jsx)(g,{mathML:c,className:"text-amber-700"}),(0,m.jsx)(g,{mathML:h,className:"font-semibold text-amber-700"})]})})]}),(0,m.jsxs)("div",{children:[(0,m.jsx)("div",{className:"text-xs text-slate-500 mb-1.5",children:"等效卷积核（Laplace 增强核）"}),(0,m.jsx)("div",{className:"inline-grid gap-[2px] bg-slate-200 p-[2px] rounded-lg",style:{gridTemplateColumns:"repeat(3, minmax(0, 1fr))"},children:d.map((e,t)=>e.map((e,a)=>(0,m.jsx)("div",{className:`w-10 h-9 flex items-center justify-center text-xs font-mono rounded ${1===t&&1===a?"bg-emerald-50 border border-emerald-300 text-emerald-700 font-semibold":"bg-white text-slate-600"}`,children:e>0?`+${e}`:e},`${t}-${a}`)))}),(0,m.jsx)("div",{className:"text-[10px] text-slate-500 mt-1",children:(0,m.jsx)(g,{mathML:y,className:"text-slate-500",mathClassName:"[&_math]:text-[0.72rem]"})})]}),(0,m.jsxs)("div",{className:"bg-emerald-50 rounded-xl border border-emerald-200 px-4 py-3",children:[(0,m.jsx)(g,{mathML:u,className:"text-slate-600"}),(0,m.jsx)(g,{mathML:b,className:"mt-1 font-bold text-emerald-700"}),(0,m.jsx)(g,{mathML:f,className:"mt-1 font-bold text-emerald-700"}),(0,m.jsx)("div",{className:"text-[10px] text-slate-500 mt-1",children:"计算过程使用归一化灰度；按 8-bit 显示时必须裁剪到 0 到 255。锐化会增强边缘反差，同时也可能放大噪声。"})]})]})]}),(0,m.jsxs)(n.TeachingCard,{children:[(0,m.jsx)("div",{className:"text-sm font-semibold text-slate-800 mb-2",children:"为什么锐化能增强边缘？"}),(0,m.jsxs)("p",{className:"text-xs leading-6 text-slate-600",children:["在图像平坦区域（灰度变化小），Laplace 值接近 0，增强后的像素值与原值几乎一致。 在边缘区域（灰度变化大），Laplace 值为较大的正值或负值，原图减去"," ",(0,m.jsx)(p,{mathML:(0,l.buildInlineMathML)("<mrow><msup><mo>∇</mo><mn>2</mn></msup><mi>f</mi></mrow>")})," ","后反差增大， 边缘两侧的亮侧更亮、暗侧更暗，从而突出轮廓。但同时，噪声也会被放大， 因为噪声点同样是灰度突变点。"]})]}),a]})},[k,v,$,R,A]),H="gradient"===v?h:u,K=(0,t.useMemo)(()=>P.length>0?{current:I,total:P.length}:null,[I,P.length]);return(0,m.jsx)(a.ConceptLayout,{title:"图像锐化",subtitle:"Image Sharpening - 梯度锐化与 Laplace 增强",operationLabel:"锐化处理",parameterIntro:"图像锐化通过增强灰度突变区域来突出边缘和轮廓；本页只围绕当前窗口比较一阶梯度、二阶 Laplace 与最终增强值。",originalImage:V,resultImage:T,parameters:z,analysisPreview:B,stepDetails:E,codeTab:(0,m.jsx)(o.CodeViewer,{languages:[{name:"TypeScript",code:H}]}),currentStep:q,stepInfo:K,onStepChange:C,onDirectionMove:G,onInputRegionSelect:_,onOutputPixelSelect:O,showOriginalGrid:"lena"!==e,originalRegionMarker:"lena"===e?"dot":"frame",imageHints:{input:"lena"===e?"真实 Lena 灰度图，红点表示当前中心像素":"红框表示当前 3×3 邻域",output:"绿色框表示当前输出像素"},singlePageScroll:!0,navigationHintText:"方向键移动 / 点击原图或结果图跳转"})}],34500)}]);