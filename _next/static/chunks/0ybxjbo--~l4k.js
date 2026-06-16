(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,9821,e=>{"use strict";var m=e.i(18749);e.s(["ImageCanvas",()=>m.default])},50192,e=>{"use strict";var m=e.i(71645),t=e.i(12392);e.s(["useLenaGrayscaleImage",0,function(e){let[a,i]=(0,m.useState)(null);return(0,m.useEffect)(()=>{let m=!1;return(0,t.loadImageAsGrayscale)("/assets/lena-original.jpg").then(a=>{m||i((0,t.resizeGrayscaleImage)((0,t.centerCropGrayscaleImage)(a),e))}).catch(()=>{m||i(null)}),()=>{m=!0}},[e]),a}])},23330,e=>{"use strict";var m=e.i(12392);e.s(["computeHistogram",0,function(e){let t=e.length,a=e[0]?.length||0,i=Array(256).fill(0),r=0;for(let o=0;o<t;o++)for(let t=0;t<a;t++){let a=Math.round(255*(0,m.clamp)(e[o][t],0,1));i[a]++,r++}return{bins:i,totalPixels:r}},"generateExampleImage",0,function(e){let t=[];for(let a=0;a<12;a++){let i=[];for(let t=0;t<12;t++){let r,o=function(e,m){let t=(17*e+53*m+7)%0x7fffffff;return((t=16807*(t=16807*t%0x7fffffff)%0x7fffffff)>>>0)/0x100000000}(t,a);switch(e){case"dark":r=Math.floor(64*o);break;case"bright":r=192+Math.floor(64*o);break;case"lowContrast":r=80+Math.floor(40*o);break;case"bimodal":r=a<6?Math.floor(64*o):192+Math.floor(64*o);break;default:r=Math.floor(256*o)}i.push((0,m.clamp)(r/255,0,1))}t.push(i)}return t}])},83023,e=>{"use strict";var m=e.i(12392),t=e.i(23330);e.s(["fixedThreshold",0,function(e,t){let a=e.length,i=e[0]?.length||0,r=(0,m.clamp)(t,0,1),o=(0,m.create2DArray)(a,i,0);for(let m=0;m<a;m++)for(let t=0;t<i;t++)o[m][t]=+(e[m][t]>r);return{image:o,threshold:r}},"otsuSteps",0,function*(e){if(!e||0===e.length||!e[0])return;let{bins:m,totalPixels:a}=(0,t.computeHistogram)(e),i=0;for(let e=0;e<256;e++)i+=e*m[e];let r=0,o=0,l=0;for(let e=0;e<256;e++){if(0===(o+=m[e])){yield{currentThreshold:e,wB:0,wF:a,mB:0,mF:i/a,variance:0,isMax:!1};continue}let t=a-o;if(0===t)break;let n=(r+=e*m[e])/o,s=(i-r)/t,h=o*t*(n-s)*(n-s),d=h>l;d&&(l=h),yield{currentThreshold:e,wB:o,wF:t,mB:n,mF:s,variance:h,isMax:d}}},"otsuThreshold",0,function(e){let{bins:a,totalPixels:i}=(0,t.computeHistogram)(e),r=0;for(let e=0;e<256;e++)r+=e*a[e];let o=0,l=0,n=0,s=0,h=0;for(let e=0;e<256;e++){if(0===(l+=a[e]))continue;if(0==(n=i-l))break;let m=(o+=e*a[e])/l,t=(r-o)/n,d=l*n*(m-t)*(m-t);d>s&&(s=d,h=e)}let d=h/255,u=e.length,c=e[0]?.length||0,x=(0,m.create2DArray)(u,c,0);for(let t=0;t<u;t++)for(let a=0;a<c;a++){let i=Math.round(255*(0,m.clamp)(e[t][a],0,1));x[t][a]=+(i>h)}return{image:x,threshold:d}}])},83221,e=>{"use strict";var m=e.i(12392);function t(e,t,a,i){!e[a]||t<0||t>=e[a].length||(e[a][t]=(0,m.clamp)(i,0,1))}function a(e,m,a,i,r){let o=Math.floor(m-i),l=Math.ceil(m+i),n=Math.floor(a-i),s=Math.ceil(a+i);for(let h=n;h<=s;h++)for(let n=o;n<=l;n++){let o=n-m,l=h-a;o*o+l*l<=i*i&&t(e,n,h,r)}}function i(e,m,t,i,r,o,l){let n=Math.max(Math.abs(i-m),Math.abs(r-t),1);for(let s=0;s<=n;s++){let h=s/n;a(e,m+(i-m)*h,t+(r-t)*h,o,l)}}function r(e={}){let o=Math.max(48,Math.round(e.width??96)),l=Math.max(32,Math.round(e.height??64)),n=Math.max(3,Math.round(e.frameCount??24)),s=e.speed??1,h=e.noiseStrength??.018,d=e.lightVariation??.035,u=e.dynamicBackgroundStrength??.025,c=e.objectValue??.86,x=Math.max(.8,Math.min(o/96,l/64)),f=14*x,b=o-f,g=.78*l,p=[],M=[],y=[],j=[];for(let e=0;e<n;e++){let r=f+e/Math.max(1,n-1)*s%1*(b-f),v=g+1.5*Math.sin(.55*e)*x,w=.75*e,T=function(e,t,a,i,r,o){return Array.from({length:t},(l,n)=>Array.from({length:e},(l,s)=>{let h,d=.18+s/Math.max(1,e-1)*.18,u=n/Math.max(1,t-1)*.08,c=i*Math.sin(.34*a),x=r*Math.sin(.22*s+.11*n+.55*a),f=.05*(n>.72*t),b=.018*(Math.floor((s+a)/12)%2==0),g=((h=43758.5453*Math.sin((s+1)*12.9898+(n+1)*78.233+41.719*a))-Math.floor(h)-.5)*o;return(0,m.clamp)(d+u+c+x+f+b+g,0,1)}))}(o,l,e,d,u,h),N=T.map(e=>[...e]),I=(0,m.create2DArray)(l,o,0),S=function(e,m,r,o,l,n,s){let h=(e,m)=>{let s=o-18*l,h=o-8*l,d=4*Math.sin(n)*l,u=5*Math.sin(n+Math.PI)*l;a(e,r,o-26*l,4.2*l,m),function(e,m,a,i,r,o){let l=Math.floor(m-i),n=Math.ceil(m+i),s=Math.floor(a-r),h=Math.ceil(a+r);for(let d=s;d<=h;d++)for(let s=l;s<=n;s++){let l=(s-m)/Math.max(1,i),n=(d-a)/Math.max(1,r);l*l+n*n<=1&&t(e,s,d,o)}}(e,r,s-3*l,5.2*l,8.5*l,m),i(e,r-4*l,s,r-10*l,h+d,1.8*l,m),i(e,r+4*l,s,r+10*l,h-d,1.8*l,m),i(e,r-2.2*l,h,r-8*l,o+u,2.2*l,m),i(e,r+2.2*l,h,r+8*l,o-u,2.2*l,m)};h(e,s),h(m,1);let d=24*l,u=32*l;return{x:Math.round(r-d/2),y:Math.round(o-u),width:Math.round(d),height:Math.round(u),centerX:Math.round(r),centerY:Math.round(o-u/2)}}(N,I,r,v,x,w,c);p.push(N),M.push(T),y.push(I),j.push(S)}return{width:o,height:l,frames:p,backgroundFrames:M,objectMasks:y,objectBoxes:j}}function o(e,m,t,a,i,r){return e.map((e,o)=>e.map((e,l)=>l>=m&&l<m+a&&o>=t&&o<t+i?r:e))}function l(e){return e.map(e=>[...e])}function n(e){return e.reduce((e,m)=>e+m.reduce((e,m)=>e+ +(m>0),0),0)}function s(e,t){let a=Math.min(e.length,t.length),i=Math.min(e[0]?.length||0,t[0]?.length||0),r=(0,m.create2DArray)(a,i,0);for(let m=0;m<a;m++)for(let a=0;a<i;a++)r[m][a]=Math.abs(e[m][a]-t[m][a]);return r}function h(e,m){return e.map(e=>e.map(e=>+(e>m)))}function d(e,t,a){return t.map((t,i)=>t.map((t,r)=>(0,m.clamp)(a*e[i][r]+(1-a)*t,0,1)))}function u(e){let m=0,t=0;for(let a of e)for(let e of a)m+=e,t++;return t>0?m/t:0}e.s(["applyThresholdMode",0,function(e,t,a){let i=(0,m.clamp)(t/255,0,1);return e.map(e=>e.map(e=>{let m=e>=i;switch(a){case"binary":return+!!m;case"binaryInv":return+!m;case"trunc":return m?i:e;case"tozero":return m?e:0;case"tozeroInv":return m?0:e}}))},"computeKittlerGradientThreshold",0,function(e){let t=e.length,a=e[0]?.length||0,i=(0,m.create2DArray)(t,a,0),r=0,o=0;for(let m=1;m<t-1;m++)for(let t=1;t<a-1;t++){let a=Math.max(Math.abs(e[m+1][t]-e[m-1][t]),Math.abs(e[m][t+1]-e[m][t-1]));i[m][t]=a,r+=a*e[m][t]*255,o+=a}let l=255*u(e),n=Math.round(o>0?r/o:l);return{threshold:(0,m.clamp)(n,0,255),gradientImage:(0,m.normalizeImage)(i),weightedGraySum:r,gradientSum:o}},"createBackgroundTeachingSequence",0,function(e,t,a,i,o={x:48,y:32}){var c,x,f,b,g;let p=r({width:96,height:64,frameCount:24,speed:1,noiseStrength:.012,lightVariation:.03,dynamicBackgroundStrength:"mixtureGaussian"===e?.045:.022}),M=Math.max(0,Math.min(i,p.frames.length-1)),y=(0,m.clamp)(t/255,0,1),j=(0,m.clamp)(a/100,.01,.8),v=p.frames.slice(0,8),w=function(e){let t=e[0]?.length||0,a=e[0]?.[0]?.length||0,i=(0,m.create2DArray)(t,a,0);for(let m of e)for(let r=0;r<t;r++)for(let t=0;t<a;t++)i[r][t]+=m[r][t]/e.length;return i}(v),T=function(e,t){let a=t.length,i=t[0]?.length||0,r=(0,m.create2DArray)(a,i,0);for(let m of e)for(let o=0;o<a;o++)for(let a=0;a<i;a++)r[o][a]+=(m[o][a]-t[o][a])**2/e.length;return r.map(e=>e.map(e=>Math.sqrt(e)))}(v,w),N=function(e,m,t,a,i){if("mean"===e)return m.map(()=>l(a));if("singleGaussian"===e){let e=[],a=l(t[0]);for(let t of m)e.push(l(a)),a=d(t,a,i);return e}let r="mixtureGaussian"===e?.55*i:i,o=[],n=l(t[0]);for(let e of m)o.push(l(n)),n=d(e,n,r);return o}(e,p.frames,p.backgroundFrames,w,j),I=function(e,t,a,i,r){if("singleGaussian"!==e)return t.map(()=>l(i));let o=[],n=l(a),s=i.map(e=>e.map(e=>Math.max(.03,e)**2));for(let e of t){o.push(s.map(e=>e.map(e=>Math.sqrt(Math.max(9e-4,e)))));let t=d(e,n,r);s=s.map((t,a)=>t.map((t,i)=>{let o=e[a][i]-n[a][i];return(0,m.clamp)((1-r)*t+r*o*o,9e-4,.25)})),n=t}return o}(e,p.frames,w,T,j),S=p.frames.map((m,t)=>{var a,i,r;return"singleGaussian"===e?(a=m,i=N[t],r=I[t],a.map((e,m)=>e.map((e,t)=>{let a=Math.max(.03,r[m][t]);return+(Math.abs(e-i[m][t])>2.5*a)}))):h(s(m,N[t]),y)}),k=S.map(n),C=p.frames[M],L=N[M],O=s(C,L),A=S[M],G=function(e,t,a){let i=u(t),r=0,o=0;for(let m=0;m<e.length;m++)for(let t=0;t<(e[0]?.length??0);t++)(a[m]?.[t]??0)>0&&(r+=e[m][t],o++);let l=o>0?r/o:.82;return[{weight:.58,mean:i,sigma:.05,background:!0},{weight:.28,mean:(0,m.clamp)(i+.12,0,1),sigma:.08,background:!0},{weight:.14,mean:l,sigma:.06,background:!1}]}(C,L,p.objectMasks[M]);return{current:C,previousFrame:p.frames[Math.max(0,M-1)],background:L,difference:O,mask:A,mean:w,deviation:I[M],mixtureComponents:G,frames:p.frames,frameIndex:M,backgroundHistory:N,maskHistory:S,foregroundCounts:k,pixelTimeline:(c=p.frames,x=N,f=S,b=o.x,g=o.y,c.map((e,m)=>{let t=Math.max(0,Math.min(g,e.length-1)),a=Math.max(0,Math.min(b,(e[0]?.length??1)-1)),i=e[t]?.[a]??0,r=x[m]?.[t]?.[a]??0,o=f[m]?.[t]?.[a]??0;return{frameIndex:m,current:i,background:r,difference:Math.abs(i-r),mask:o}}))}},"createFrameDifferenceTeachingSequence",0,function(e,t,a,i,o,l={x:48,y:42}){var d,u,c,x,f,b,g,p,M;let y,j,v,w,T,N,I,S=r({width:96,height:64,frameCount:24,speed:Math.max(.45,i/6),noiseStrength:o/255,lightVariation:.03,dynamicBackgroundStrength:.022}),k=Math.max(1,Math.min(a,Math.max(1,S.frames.length-2))),C=k-1,L=k+1,O={previous:S.frames[C],current:S.frames[k],next:S.frames[L]},A=(j=s(O.current,O.previous),v=s(O.next,O.current),T=h(j,w=(0,m.clamp)(t/255,0,1)),N=h(v,w),I="twoFrame"===e?T:(d=T,u=N,d.map((e,m)=>e.map((e,t)=>+!!(e>0&&(u[m]?.[t]??0)>0)))),{difference:"twoFrame"===e?j:(0,m.normalizeImage)((c=j,x=v,c.map((e,m)=>e.map((e,t)=>e+(x[m]?.[t]??0))))),previousDifference:j,nextDifference:v,binary:I,cleaned:function(e){let t=e.length,a=e[0]?.length||0,i=(0,m.create2DArray)(t,a,0);for(let m=0;m<t;m++)for(let t=0;t<a;t++){let a=!0;for(let i=-1;i<=1;i++)for(let r=-1;r<=1;r++)a=a&&(e[m+i]?.[t+r]??0)>0;i[m][t]=+!!a}return i}(function(e){let t=e.length,a=e[0]?.length||0,i=(0,m.create2DArray)(t,a,0);for(let m=0;m<t;m++)for(let t=0;t<a;t++){let a=!1;for(let i=-1;i<=1;i++)for(let r=-1;r<=1;r++)a=a||(e[m+i]?.[t+r]??0)>0;i[m][t]=+!!a}return i}(I))});return{...A,frames:S.frames,width:S.width,height:S.height,frameIndex:k,previousIndex:C,nextIndex:L,previous:O.previous,current:O.current,next:O.next,motionPixelCount:n(A.binary),cleanedPixelCount:n(A.cleaned),pixelTimeline:(f=S.frames,b=e,g=t,p=l.x,M=l.y,y=(0,m.clamp)(g/255,0,1),f.map((e,m)=>{let t=Math.max(0,Math.min(M,e.length-1)),a=Math.max(0,Math.min(p,(e[0]?.length??1)-1)),i=f[Math.max(0,m-1)],r=f[Math.min(f.length-1,m+1)],o=e[t]?.[a]??0,l=i?.[t]?.[a]??o,n=r?.[t]?.[a]??o,s=Math.abs(o-l),h=Math.abs(n-o),d=+(s>y),u=+(h>y);return{frameIndex:m,current:o,previous:l,next:n,previousDifference:s,nextDifference:h,previousMask:d,nextMask:u,finalMask:"twoFrame"===b?d:+(d>0&&u>0)}}))}},"createOtsuVarianceProfile",0,function(e){let t=Array(256).fill(0),a=0,i=0;for(let r of e)for(let e of r){let r=Math.round(255*(0,m.clamp)(e,0,1));t[r]++,a++,i+=r}let r=[],o=0,l=0;for(let e=0;e<256;e++){o+=t[e],l+=e*t[e];let m=a-o;if(0===o||0===m){r.push({threshold:e,variance:0});continue}let n=l/o,s=(i-l)/m,h=o/a,d=m/a;r.push({threshold:e,variance:h*d*(n-s)**2})}return r},"createThresholdScene",0,function(e){if("spotlight"===e)return Array.from({length:32},(e,t)=>Array.from({length:48},(e,a)=>{let i=(a-26.400000000000002)/48,r=(t-14.4)/32,o=Math.max(0,.78-2.1*Math.sqrt(i*i+r*r));return(0,m.clamp)(.12+o+a/48*.08,0,1)}));let t=o(function(e=0){return Array.from({length:32},(t,a)=>Array.from({length:48},(t,i)=>(0,m.clamp)(.18+i/47*.2+.04*((i+a+e)%9==0),0,1)))}(),28,9,12,15,.82),a=o(t,31,13,4,4,"noisyObject"===e?.38:.92);if("noisyObject"===e)return a.map((e,t)=>e.map((e,a)=>{let i,r=((i=43758.5453*Math.sin((a+1)*12.9898+(t+1)*78.233+188.595))-Math.floor(i)-.5)*.18;return(0,m.clamp)(e+r,0,1)}));return a}],83221)},76308,e=>{"use strict";var m=e.i(43476),t=e.i(71645);e.i(33999);var a=e.i(13870),i=e.i(75345),r=e.i(85255),o=e.i(9821),l=e.i(54712),n=e.i(27981),s=e.i(96891),h=e.i(23330),d=e.i(83023),u=e.i(83221),c=e.i(50192);let x=[{value:"manual",label:"固定阈值"},{value:"otsu",label:"OTSU 自动阈值"},{value:"kittler",label:"Kittler 梯度阈值"}],f=[{value:"bimodal",label:"双峰前景"},{value:"spotlight",label:"光斑目标"},{value:"noisyObject",label:"含噪目标"},{value:"lenaOriginal",label:"Lena 灰度图"}],b=[{value:"binary",label:"BINARY（二值）"},{value:"binaryInv",label:"BINARY_INV（反二值）"},{value:"trunc",label:"TRUNC（截断）"},{value:"tozero",label:"TOZERO（低值清零）"},{value:"tozeroInv",label:"TOZERO_INV（高值清零）"}],g={binary:{name:"BINARY",description:"大于等于阈值的像素输出最大值，其他像素输出 0。适合生成前景掩膜。"},binaryInv:{name:"BINARY_INV",description:"大于等于阈值的像素输出 0，其他像素输出最大值。适合目标比背景更暗的情形。"},trunc:{name:"TRUNC",description:"大于阈值的像素被截断为阈值，其他像素保留原灰度。该模式不是二值掩膜。"},tozero:{name:"TOZERO",description:"大于等于阈值的像素保留原灰度，其他像素置 0。该模式保留亮目标的灰度细节。"},tozeroInv:{name:"TOZERO_INV",description:"小于阈值的像素保留原灰度，其他像素置 0。该模式保留暗目标的灰度细节。"}},p=`function fixedThreshold(image: number[][], threshold: number): number[][] {
  return image.map(row =>
    row.map(gray => (gray * 255 >= threshold ? 1 : 0))
  );
}

function otsuThreshold(histogram: number[], total: number): number {
  let totalGray = 0;
  for (let i = 0; i < 256; i++) totalGray += i * histogram[i];

  let backgroundCount = 0;
  let backgroundGray = 0;
  let bestThreshold = 0;
  let maxVariance = 0;

  for (let t = 0; t < 256; t++) {
    backgroundCount += histogram[t];
    backgroundGray += t * histogram[t];
    const foregroundCount = total - backgroundCount;
    if (backgroundCount === 0 || foregroundCount === 0) continue;

    const mu0 = backgroundGray / backgroundCount;
    const mu1 = (totalGray - backgroundGray) / foregroundCount;
    const w0 = backgroundCount / total;
    const w1 = foregroundCount / total;
     const variance = w0 * w1 * (mu0 - mu1) ** 2; // σ\xb2_B = ω₀ ω₁ (μ₀ - μ₁)\xb2，标准 OTSU 类间方差（w0,w1 已含 \xf7total 归一化）

    if (variance > maxVariance) {
      maxVariance = variance;
      bestThreshold = t;
    }
  }
  return bestThreshold;
}

function kittlerGradientThreshold(image: number[][]): number {
  let weightedGraySum = 0;
  let gradientSum = 0;

  for (let y = 1; y < image.length - 1; y++) {
    for (let x = 1; x < image[0].length - 1; x++) {
      const fi = image[y + 1][x] - image[y - 1][x];
      const fj = image[y][x + 1] - image[y][x - 1];
      const grad = Math.max(Math.abs(fi), Math.abs(fj));
      weightedGraySum += grad * image[y][x] * 255;
      gradientSum += grad;
    }
  }

  return Math.round(weightedGraySum / gradientSum);
}`;function M(e){return`<mn>${e}</mn>`}function y(e){return(0,r.buildInlineMathML)(`<mrow><mi>T</mi><mo>=</mo>${M(e)}</mrow>`)}function j(e,t){return(0,m.jsxs)("span",{className:"inline-flex items-baseline gap-1",children:[(0,m.jsx)("span",{children:e}),(0,m.jsx)(r.InlineMath,{mathML:y(t),className:"[&_math]:text-xs"})]})}function v(e){return Math.round(255*Math.max(0,Math.min(1,e)))}function w({image:e,threshold:t,profile:a,method:i}){let o=(0,h.computeHistogram)(e).bins,l=Math.max(...o,1),n=Math.max(...a.map(e=>e.variance),1),s=e=>48+e/255*848;return(0,m.jsxs)("div",{className:"w-full",children:[(0,m.jsxs)("div",{className:"mb-3 flex flex-wrap items-center justify-between gap-2",children:[(0,m.jsxs)("div",{children:[(0,m.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"阈值选择曲线"}),(0,m.jsx)("p",{className:"mt-1 text-xs leading-5 text-slate-500",children:"蓝色柱表示灰度直方图，橙色曲线表示 OTSU 在每个候选阈值处的类间方差。红线为当前方法得到的阈值。"})]}),(0,m.jsxs)("div",{className:"flex flex-wrap gap-2 text-xs",children:[(0,m.jsx)("span",{className:"rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600",children:(0,m.jsx)(r.InlineMath,{mathML:y(t),className:"[&_math]:text-xs"})}),(0,m.jsx)("span",{className:"rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700",children:"manual"===i?"人工指定":"otsu"===i?"OTSU 最大类间方差":"Kittler 梯度加权"})]})]}),(0,m.jsxs)("svg",{viewBox:"0 0 920 270",className:"h-auto w-full",children:[(0,m.jsx)("rect",{x:"0",y:"0",width:920,height:270,rx:"16",fill:"#f8fafc"}),(0,m.jsx)("line",{x1:48,y1:228,x2:896,y2:228,stroke:"#cbd5e1"}),(0,m.jsx)("line",{x1:48,y1:24,x2:48,y2:228,stroke:"#cbd5e1"}),o.map((e,a)=>{let i=e/l*204,r=s(a);return(0,m.jsx)("rect",{x:r,y:228-i,width:Math.max(1.4,2.5125),height:i,fill:a<=t?"#94a3b8":"#3b82f6",opacity:e>0?.78:.14},a)}),(0,m.jsx)("polyline",{points:a.map(e=>{let m=s(e.threshold),t=228-e.variance/n*179.52;return`${m},${t}`}).join(" "),fill:"none",stroke:"#f97316",strokeWidth:"3",opacity:"0.92"}),(0,m.jsx)("line",{x1:s(t),y1:24,x2:s(t),y2:228,stroke:"#ef4444",strokeWidth:"3"}),(0,m.jsxs)("text",{x:s(t)+8,y:40,fontSize:"13",fill:"#dc2626",children:["阈值 ",t]}),[0,64,128,192,255].map(e=>(0,m.jsxs)("g",{children:[(0,m.jsx)("line",{x1:s(e),y1:228,x2:s(e),y2:233,stroke:"#94a3b8"}),(0,m.jsx)("text",{x:s(e),y:254,textAnchor:"middle",fontSize:"11",fill:"#64748b",children:e})]},e)),(0,m.jsx)("text",{x:48,y:16,fontSize:"11",fill:"#64748b",children:"像素数 / 类间方差归一化显示"}),(0,m.jsx)("text",{x:896,y:254,textAnchor:"end",fontSize:"11",fill:"#64748b",children:"灰度级"})]})]})}e.s(["default",0,function(){var e,h,T;let[N,I]=(0,t.useState)("lenaOriginal"),[S,k]=(0,t.useState)("otsu"),[C,L]=(0,t.useState)(128),[O,A]=(0,t.useState)("binary"),G=(0,c.useLenaGrayscaleImage)(96),_=(0,t.useMemo)(()=>"lenaOriginal"===N?G??(0,u.createThresholdScene)("bimodal"):(0,u.createThresholdScene)(N),[G,N]),B=(0,t.useMemo)(()=>(0,d.otsuThreshold)(_),[_]),F=(0,t.useMemo)(()=>(0,u.computeKittlerGradientThreshold)(_),[_]),z=(0,t.useMemo)(()=>(0,u.createOtsuVarianceProfile)(_),[_]),R=Math.round(255*B.threshold),$=(0,t.useMemo)(()=>"manual"===S?C:"otsu"===S?R:F.threshold,[F.threshold,C,S,R]),U=(0,t.useMemo)(()=>(0,u.applyThresholdMode)(_,$,O),[_,O,$]),V=(0,t.useMemo)(()=>(0,u.applyThresholdMode)(_,C,"binary"),[C,_]),D=(0,t.useMemo)(()=>(0,u.applyThresholdMode)(_,R,"binary"),[_,R]),P=(0,t.useMemo)(()=>(0,u.applyThresholdMode)(_,F.threshold,"binary"),[F.threshold,_]),K=(0,t.useMemo)(()=>U.reduce((e,m)=>e+m.filter(e=>e>0).length,0),[U]),E=_.length*(_[0]?.length||0),Y=(0,t.useMemo)(()=>{let e=Math.floor(.48*_.length);return{x:Math.floor(.58*(_[0]?.length||1)),y:e}},[_]),q=v(_[Y.y]?.[Y.x]??0),Z=v(U[Y.y]?.[Y.x]??0),H=q>=$?q:0,W=Math.max(...z.map(e=>e.variance),0),X=(0,t.useCallback)(e=>{k(e)},[]),J=(0,t.useCallback)(e=>{I(e)},[]),Q=(0,t.useCallback)(e=>{A(e)},[]),ee=(0,t.useCallback)(e=>{if("manual"!==S)return;let m="up"===e||"down"===e?10:1;L(t=>"left"===e||"up"===e?Math.max(0,t-m):Math.min(255,t+m))},[S]),em=(0,m.jsxs)("div",{className:"mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-6 xl:gap-8",children:[(0,m.jsxs)("div",{className:"flex flex-col items-center gap-3",children:[(0,m.jsxs)("div",{className:"flex items-center gap-2",children:[(0,m.jsx)("span",{className:"rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600",children:"灰度图"}),(0,m.jsxs)("span",{className:"font-mono text-xs text-slate-400",children:[_[0]?.length,"×",_.length]})]}),(0,m.jsx)(o.ImageCanvas,{image:_,maxDisplaySize:360,showGrid:!1,selectedRegionMarker:"dot"}),(0,m.jsxs)("span",{className:"rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-600",children:["示例场景：",f.find(e=>e.value===N)?.label]})]}),(0,m.jsxs)("div",{className:"shrink-0 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center shadow-[0_10px_24px_rgba(245,158,11,0.12)]",children:[(0,m.jsx)("div",{className:"text-[10px] font-semibold tracking-[0.12em] text-amber-700",children:"阈值判定"}),(0,m.jsx)("div",{className:"mt-1 tabular-nums text-amber-800",children:(0,m.jsx)(r.InlineMath,{mathML:y($),className:"[&_math]:text-2xl [&_math]:font-bold"})}),(0,m.jsx)("div",{className:"mt-1 text-[11px] text-amber-700",children:"manual"===S?"固定阈值":"otsu"===S?"OTSU 自动阈值":"Kittler 梯度阈值"})]}),(0,m.jsxs)("div",{className:"flex flex-col items-center gap-3",children:[(0,m.jsxs)("div",{className:"flex items-center gap-2",children:[(0,m.jsx)("span",{className:"rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600",children:"阈值结果"}),(0,m.jsxs)("span",{className:"font-mono text-xs text-slate-400",children:[U[0]?.length,"×",U.length]})]}),(0,m.jsx)(o.ImageCanvas,{image:U,maxDisplaySize:360,showGrid:!1}),(0,m.jsxs)("span",{className:"rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600",children:[g[O].name,"，非零输出 ",K," / ",E]})]})]}),et=(0,m.jsx)(l.ProcessRail,{children:(0,m.jsx)(w,{image:_,threshold:$,profile:z,method:S})}),ea=(0,m.jsxs)("div",{className:"space-y-5",children:[(0,m.jsxs)(s.TeachingCard,{children:[(0,m.jsx)("h2",{className:"text-sm font-semibold text-slate-800",children:"阈值来源：决定 T 从哪里来"}),(0,m.jsxs)("div",{className:"space-y-4",children:[(0,m.jsx)(r.FormulaCard,{label:"固定阈值分割",mathML:(0,r.buildInlineMathML)(`
    <mrow>
      <mi>F</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo>
      <mo>=</mo>
      <mrow>
        <mo>{</mo>
        <mtable>
          <mtr>
            <mtd><mi>f</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo></mtd>
            <mtd><mi>f</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>≥</mo><mi>T</mi></mtd>
          </mtr>
          <mtr>
            <mtd><mn>0</mn></mtd>
            <mtd><mi>f</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>&lt;</mo><mi>T</mi></mtd>
          </mtr>
        </mtable>
      </mrow>
      <mo>,</mo>
      <mi>T</mi><mo>=</mo>${M($)}
      <mo>,</mo>
      <mi>f</mi><mo>(</mo><msub><mi>x</mi><mn>0</mn></msub><mo>,</mo><msub><mi>y</mi><mn>0</mn></msub><mo>)</mo>
      <mo>=</mo>${M(q)}
      <mo>⇒</mo>
      <mi>F</mi><mo>(</mo><msub><mi>x</mi><mn>0</mn></msub><mo>,</mo><msub><mi>y</mi><mn>0</mn></msub><mo>)</mo>
      <mo>=</mo>${M(H)}
    </mrow>
  `),note:"固定阈值由人工给定，适合光照稳定、目标与背景灰度差异明确的场景。",tone:"embedded"}),(0,m.jsx)(r.FormulaCard,{label:"OTSU 最大类间方差",mathML:(0,r.buildInlineMathML)(`
    <mrow>
      <msup><mi>T</mi><mo>*</mo></msup>
      <mo>=</mo>
      <munder>
        <mrow><mi>argmax</mi></mrow>
        <mrow><mn>0</mn><mo>≤</mo><mi>t</mi><mo>≤</mo><mn>255</mn></mrow>
      </munder>
      <msubsup><mi>σ</mi><mi>B</mi><mn>2</mn></msubsup><mo>(</mo><mi>t</mi><mo>)</mo>
      <mspace width="1em"/>
      <msubsup><mi>σ</mi><mi>B</mi><mn>2</mn></msubsup><mo>(</mo><mi>t</mi><mo>)</mo>
      <mo>=</mo>
      <msub><mi>ω</mi><mn>0</mn></msub><mo>(</mo><mi>t</mi><mo>)</mo>
      <msub><mi>ω</mi><mn>1</mn></msub><mo>(</mo><mi>t</mi><mo>)</mo>
      <msup>
        <mrow><mo>(</mo><msub><mi>μ</mi><mn>0</mn></msub><mo>(</mo><mi>t</mi><mo>)</mo><mo>-</mo><msub><mi>μ</mi><mn>1</mn></msub><mo>(</mo><mi>t</mi><mo>)</mo><mo>)</mo></mrow>
        <mn>2</mn>
      </msup>
      <mspace width="1em"/>
      <msup><mi>T</mi><mo>*</mo></msup>
      <mo>=</mo>${M(R)}
      <mo>,</mo><mspace width="0.5em"/>
      <msubsup><mi>σ</mi><mi>B</mi><mn>2</mn></msubsup><mo>(</mo><msup><mi>T</mi><mo>*</mo></msup><mo>)</mo>
      <mo>=</mo>${M(W.toFixed(2))}
    </mrow>
  `),note:"OTSU 遍历全部候选阈值，选择背景类与目标类之间类间方差最大的阈值。",tone:"embedded"}),(0,m.jsx)(r.FormulaCard,{label:"Kittler 梯度加权阈值",mathML:(e=F.threshold,h=F.weightedGraySum,T=F.gradientSum,(0,r.buildInlineMathML)(`
    <mrow>
      <mi>K</mi><mi>T</mi>
      <mo>=</mo>
      <mfrac>
        <mrow>
          <mo>∑</mo><mi>g</mi><mi>r</mi><mi>a</mi><mi>d</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo>
          <mo>\xb7</mo>
          <mi>f</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo>
        </mrow>
        <mrow>
          <mo>∑</mo><mi>g</mi><mi>r</mi><mi>a</mi><mi>d</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo>
        </mrow>
      </mfrac>
      <mspace width="0.8em"/>
      <mo>=</mo>
      <mfrac>
        ${M(h.toFixed(1))}
        ${M(T.toFixed(1))}
      </mfrac>
      <mspace width="0.8em"/>
      <mo>=</mo>
      ${M(e)}
    </mrow>
  `)),note:"课件版 Kittler 使用梯度作为权重，使边缘附近的灰度对全局阈值贡献更大。",tone:"embedded"})]})]}),(0,m.jsxs)(s.TeachingCard,{children:[(0,m.jsx)("h2",{className:"text-sm font-semibold text-slate-800",children:"输出类型：决定得到 T 后如何生成 dst 图像"}),(0,m.jsxs)("p",{className:"mt-2 text-xs leading-6 text-slate-600",children:["OpenCV 的 `threshold_type` 包含两类信息：一类是输出规则，例如 BINARY、TRUNC、TOZERO；另一类是自动选阈值标志，例如 OTSU。 “阈值方法”表示 ",(0,m.jsx)(r.InlineMath,{mathML:(0,r.buildInlineMathML)("<mi>T</mi>"),className:"[&_math]:text-xs"})," 的来源，“输出类型”表示同一个 ",(0,m.jsx)(r.InlineMath,{mathML:(0,r.buildInlineMathML)("<mi>T</mi>"),className:"[&_math]:text-xs"})," 代入后每个像素如何写入结果图。"]}),(0,m.jsxs)("div",{className:"mt-3 grid gap-3 text-xs leading-6 text-slate-600 md:grid-cols-2",children:[(0,m.jsxs)("div",{className:"border-l-2 border-amber-300 pl-3",children:[(0,m.jsx)("div",{className:"font-semibold text-amber-700",children:"阈值来源"}),(0,m.jsx)("p",{children:"固定阈值由滑杆给定；OTSU 由直方图类间方差最大化得到；Kittler 由梯度加权灰度平均得到。"})]}),(0,m.jsxs)("div",{className:"border-l-2 border-emerald-300 pl-3",children:[(0,m.jsx)("div",{className:"font-semibold text-emerald-700",children:"输出规则"}),(0,m.jsxs)("p",{children:["输出类型不重新计算阈值，只规定"," ",(0,m.jsx)(r.InlineMath,{mathML:(0,r.buildInlineMathML)("<mrow><mi>src</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo></mrow>"),className:"[&_math]:text-xs"})," ","与"," ",(0,m.jsx)(r.InlineMath,{mathML:(0,r.buildInlineMathML)("<mi>T</mi>"),className:"[&_math]:text-xs"})," ","比较后写入 0、最大值、阈值或原灰度。"]})]})]}),(0,m.jsx)(r.FormulaCard,{className:"mt-4",label:`当前输出类型：${g[O].name}`,mathML:function(e,m,t,a){let i,o=`
    <mspace width="0.8em"/>
    <mi>f</mi><mo>(</mo><msub><mi>x</mi><mn>0</mn></msub><mo>,</mo><msub><mi>y</mi><mn>0</mn></msub><mo>)</mo>
    <mo>=</mo>${M(m)}
    <mo>,</mo>
    <mi>T</mi><mo>=</mo>${M(t)}
    <mo>→</mo>
    <mi>F</mi><mo>(</mo><msub><mi>x</mi><mn>0</mn></msub><mo>,</mo><msub><mi>y</mi><mn>0</mn></msub><mo>)</mo>
    <mo>=</mo>${M(a)}
  `;switch(e){case"binary":i=`<mo>{</mo>
        <mtable>
          <mtr>
            <mtd><mn>255</mn></mtd>
            <mtd><mi>f</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>≥</mo><mi>T</mi></mtd>
          </mtr>
          <mtr>
            <mtd><mn>0</mn></mtd>
            <mtd><mi>f</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>&lt;</mo><mi>T</mi></mtd>
          </mtr>
        </mtable>`;break;case"binaryInv":i=`<mo>{</mo>
        <mtable>
          <mtr>
            <mtd><mn>0</mn></mtd>
            <mtd><mi>f</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>≥</mo><mi>T</mi></mtd>
          </mtr>
          <mtr>
            <mtd><mn>255</mn></mtd>
            <mtd><mi>f</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>&lt;</mo><mi>T</mi></mtd>
          </mtr>
        </mtable>`;break;case"trunc":i="<mi>min</mi><mo>(</mo><mi>f</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>,</mo><mi>T</mi><mo>)</mo>";break;case"tozero":i=`<mo>{</mo>
        <mtable>
          <mtr>
            <mtd><mi>f</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo></mtd>
            <mtd><mi>f</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>≥</mo><mi>T</mi></mtd>
          </mtr>
          <mtr>
            <mtd><mn>0</mn></mtd>
            <mtd><mi>f</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>&lt;</mo><mi>T</mi></mtd>
          </mtr>
        </mtable>`;break;case"tozeroInv":i=`<mo>{</mo>
        <mtable>
          <mtr>
            <mtd><mn>0</mn></mtd>
            <mtd><mi>f</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>≥</mo><mi>T</mi></mtd>
          </mtr>
          <mtr>
            <mtd><mi>f</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo></mtd>
            <mtd><mi>f</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>&lt;</mo><mi>T</mi></mtd>
          </mtr>
        </mtable>`}return(0,r.buildInlineMathML)(`
    <mrow>
      <mi>F</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo>
      <mo>=</mo>
      <mrow>
        ${i}
      </mrow>
      <mo>,</mo>
      ${o}
    </mrow>
  `)}(O,q,$,Z),note:g[O].description,tone:"embedded"})]}),(0,m.jsxs)(s.TeachingCard,{children:[(0,m.jsx)("h2",{className:"text-sm font-semibold text-slate-800",children:"同一输入下的预设结果对照"}),(0,m.jsxs)("p",{className:"mt-2 text-xs leading-6 text-slate-600",children:["下列结果均来自当前灰度图。三种阈值来源使用相同的 BINARY 输出规则，因此差异只来自阈值"," ",(0,m.jsx)(r.InlineMath,{mathML:(0,r.buildInlineMathML)("<mi>T</mi>"),className:"[&_math]:text-xs"})," ","的选择方式。"]}),(0,m.jsx)("div",{className:"mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4",children:[{id:"original",label:"原始灰度图",image:_,hint:"输入"},{id:"manual",label:j("固定阈值",C),image:V,hint:"人工指定"},{id:"otsu",label:j("OTSU",R),image:D,hint:"类间方差最大"},{id:"kittler",label:j("Kittler",F.threshold),image:P,hint:"梯度加权"}].map(e=>(0,m.jsxs)("figure",{className:"space-y-2",children:[(0,m.jsx)("div",{className:"flex justify-center rounded-xl border border-slate-200 bg-white p-2 shadow-sm",children:(0,m.jsx)(o.ImageCanvas,{image:e.image,maxDisplaySize:210,showGrid:!1})}),(0,m.jsxs)("figcaption",{className:"text-center",children:[(0,m.jsx)("div",{className:"text-xs font-semibold text-slate-700",children:e.label}),(0,m.jsx)("div",{className:"mt-0.5 text-[11px] text-slate-500",children:e.hint})]})]},e.id))})]}),(0,m.jsxs)(s.TeachingCard,{children:[(0,m.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"课堂观察要点"}),(0,m.jsxs)("div",{className:"mt-2 space-y-1.5 text-xs leading-6 text-slate-600",children:[(0,m.jsx)("p",{children:"固定阈值适合验证阈值线移动对分割结果的直接影响，但对光照和场景变化敏感。"}),(0,m.jsx)("p",{children:"OTSU 适合直方图具有较明显双峰的图像；当真实图像灰度分布复杂时，阈值仍可能只得到粗分割。"}),(0,m.jsx)("p",{children:"Kittler 使用梯度信息强调边界附近灰度，对边缘清晰的目标更敏感，但对噪声和纹理同样敏感。"})]})]})]}),ei=(0,m.jsxs)("div",{className:"space-y-4",children:[(0,m.jsx)(n.SelectParam,{label:"示例场景",value:N,onChange:J,options:f}),(0,m.jsx)(n.SelectParam,{label:"阈值方法",value:S,onChange:X,options:x}),"manual"===S?(0,m.jsx)(n.SliderParam,{label:"固定阈值",value:C,onChange:L,min:0,max:255,step:1}):(0,m.jsxs)("div",{className:"border-l-2 border-emerald-300 bg-emerald-50/70 px-3 py-3",children:[(0,m.jsx)("div",{className:"text-xs font-medium text-emerald-700",children:"自动计算阈值"}),(0,m.jsx)("div",{className:"mt-1 text-2xl font-bold tabular-nums text-emerald-800",children:$}),(0,m.jsx)("p",{className:"mt-1 text-[11px] leading-5 text-emerald-700",children:"otsu"===S?"由直方图类间方差最大化得到。":"由梯度加权灰度平均得到。"})]}),(0,m.jsx)(n.SelectParam,{label:"输出类型",value:O,onChange:Q,options:b}),(0,m.jsxs)("div",{className:"border-t border-slate-200 pt-3 text-[11px] leading-5 text-slate-500",children:["“阈值方法”决定 ",(0,m.jsx)(r.InlineMath,{mathML:(0,r.buildInlineMathML)("<mi>T</mi>"),className:"[&_math]:text-[11px]"})," 的来源；“输出类型”决定每个像素与 ",(0,m.jsx)(r.InlineMath,{mathML:(0,r.buildInlineMathML)("<mi>T</mi>"),className:"[&_math]:text-[11px]"})," 比较后的写入规则。"]})]});return(0,m.jsx)(i.ConceptLayout,{title:"阈值分割与自动阈值",subtitle:"Threshold & Auto Threshold - 从固定阈值到自动阈值选择",operationLabel:"阈值判定",parameterIntro:"切换示例场景、阈值来源和输出类型；当前像素只看灰度值、阈值线和二值化结果之间的判断链。",originalImage:_,resultImage:U,parameters:ei,analysisPreview:et,stepDetails:ea,codeTab:(0,m.jsx)(a.CodeViewer,{languages:[{name:"TypeScript",code:p}]}),mainVisual:em,imageLabels:{input:"灰度图",output:"阈值结果"},singlePageScroll:!0,stepInfo:"manual"===S?{current:C,total:256}:null,onDirectionMove:"manual"===S?ee:void 0,showNavigationControls:"manual"===S})}])}]);