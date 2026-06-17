(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,21306,e=>{"use strict";var t=e.i(43476),s=e.i(71645),a=e.i(57688);e.i(33999);var r=e.i(83032),m=e.i(13870),i=e.i(75345),l=e.i(54712),n=e.i(85255),o=e.i(9821),d=e.i(27981),x=e.i(96891),c=e.i(55052),h=e.i(12392);function u(e,t,s,a){let r=2*a+1,m=(0,h.create2DArray)(r,r,0),i=(0,h.create2DArray)(r,r,0),l=e[0]?.length??0,n=e.length;for(let r=-a;r<=a;r++)for(let o=-a;o<=a;o++){let d=t+o,x=s+r,c=r+a,h=o+a;if(d<=0||d>=l-1||x<=0||x>=n-1)continue;let u=e[x][d+1]-e[x][d-1],p=e[x+1][d]-e[x-1][d];m[c][h]=Math.sqrt(u*u+p*p),i[c][h]=Math.atan2(p,u)}return{magnitudes:m,orientations:i}}function p(e,t,s){let a=Array(8).fill(0),r=2*Math.PI/8;for(let m=-s;m<=s;m++)for(let i=-s;i<=s;i++){let l=m+s,n=i+s,o=Math.floor((t[l][n]+Math.PI)/r)%8,d=Math.exp(-(i*i+m*m)/(2*(.5*s)**2));a[o]+=e[l][n]*d}let m=a.reduce((e,t)=>e+t,0);if(m>0)for(let e=0;e<8;e++)a[e]/=m;return a}function g(e,t,s,a,r){let m=[],i=[];for(let l=0;l<4;l++)for(let n=0;n<4;n++){let o=Array(8).fill(0),d=a+(l-1.5)*4,x=s+(n-1.5)*4;for(let m=-1;m<=1;m++)for(let i=-1;i<=1;i++){let c=Math.round(d+m)-(a-8),h=Math.round(x+i)-(s-8);if(c<0||c>=t.length||h<0||h>=(t[0]?.length??0))continue;let u=e[c][h],p=(Math.floor((t[c][h]-r+Math.PI)/(Math.PI/4))%8+8)%8,g=Math.sqrt((l-1.5+m/4)**2+(n-1.5+i/4)**2);o[p]+=u*Math.exp(-g*g/2)}let c=o.reduce((e,t)=>e+t,0);if(c>0)for(let e=0;e<8;e++)o[e]/=c;m.push(...o),i.push(o)}let l=Math.sqrt(m.reduce((e,t)=>e+t*t,0));if(l>0){for(let e=0;e<m.length;e++)m[e]/=l;for(let e=0;e<16;e++)for(let t=0;t<8;t++)i[e][t]/=l}return{descriptor:m,grid:i}}function b(e,t,s,a){let r=[],m=[],i=20*a/4,l=e[0]?.length??0,n=e.length;for(let a=0;a<4;a++)for(let o=0;o<4;o++){let d=t+(o-1.5)*i,x=s+(a-1.5)*i,c=0,h=0,u=0,p=0;for(let t=-2;t<=2;t++)for(let s=-2;s<=2;s++){let a=Math.round(d+s),r=Math.round(x+t);if(a<=0||a>=l-1||r<=0||r>=n-1)continue;let m=e[r][a+1]-e[r][a-1],i=e[r+1][a]-e[r-1][a];c+=m,h+=i,u+=Math.abs(m),p+=Math.abs(i)}r.push(c,h,u,p),m.push([c,h,u,p])}let o=Math.sqrt(r.reduce((e,t)=>e+t*t,0));if(o>0){for(let e=0;e<r.length;e++)r[e]/=o;for(let e=0;e<16;e++)for(let t=0;t<4;t++)m[e][t]/=o}return{descriptor:r,grid:m}}function f(e,t,s,a){let r=2**(1/Math.max(s,1)),m=[];for(let a=0;a<s+2;a++)m.push(function(e,t){let s=e.length,a=e[0]?.length??0;if(0===s||0===a)return e;let r=Math.ceil(2*t),m=2*r+1,i=Array(m),l=0;for(let e=0;e<m;e++){let s=e-r;i[e]=Math.exp(-(s*s)/(2*t*t)),l+=i[e]}for(let e=0;e<m;e++)i[e]/=l;let n=(0,h.create2DArray)(s,a,0);for(let t=0;t<s;t++)for(let s=0;s<a;s++){let l=0;for(let n=0;n<m;n++){let m=s+n-r;m>=0&&m<a&&(l+=e[t][m]*i[n])}n[t][s]=l}let o=(0,h.create2DArray)(s,a,0);for(let e=0;e<s;e++)for(let t=0;t<a;t++){let a=0;for(let l=0;l<m;l++){let m=e+l-r;m>=0&&m<s&&(a+=n[m][t]*i[l])}o[e][t]=a}return o}(e,t*r**a));let i=[];for(let e=0;e<s+1;e++)i.push(function(e,t){let s=e.length,a=e[0]?.length??0,r=(0,h.create2DArray)(s,a,0);for(let m=0;m<s;m++)for(let s=0;s<a;s++)r[m][s]=t[m][s]-e[m][s];return r}(m[e],m[e+1]));let l=new Map,n=[],o=i[0]?.length??e.length,d=i[0]?.[0]?.length??e[0]?.length??64;for(let e=1;e<i.length-1;e++){let s=function(e,t,s,a){let r=t.length,m=t[0]?.length??0,i=[],l=new Map;for(let n=1;n<r-1;n++)for(let r=1;r<m-1;r++){let o=t[n][r];if(.005>Math.abs(o))continue;let d=[],x=[],c=[],h=!0,u=!0;for(let e=-1;e<=1;e++)for(let s=-1;s<=1;s++){let a;if(0===s&&0===e)continue;let m=t[n+e][r+s];o>m?a="greater":o<m?(a="less",h=!1):(a="equal",h=!1,u=!1),m>=o&&(h=!1),m<=o&&(u=!1),d.push({dx:s,dy:e,value:m,relation:a})}if(!h&&!u)continue;for(let t=-1;t<=1;t++)for(let s=-1;s<=1;s++){let a,m=e[n+t][r+s];o>m?a="greater":o<m?(a="less",h=!1):(a="equal",h=!1,u=!1),m>=o&&(h=!1),m<=o&&(u=!1),x.push({dx:s,dy:t,value:m,relation:a})}if(!h&&!u)continue;for(let e=-1;e<=1;e++)for(let t=-1;t<=1;t++){let a,m=s[n+e][r+t];o>m?a="greater":o<m?(a="less",h=!1):(a="equal",h=!1,u=!1),m>=o&&(h=!1),m<=o&&(u=!1),c.push({dx:t,dy:e,value:m,relation:a})}if(!h&&!u)continue;let p=h?"max":"min",g=(e,t,s)=>{let a=[];for(let r=-1;r<=1;r++){let m=[];for(let a=-1;a<=1;a++)m.push(e[s+r][t+a]);a.push(m)}return a},b={prevDogPatch:g(e,r,n),currentDogPatch:g(t,r,n),nextDogPatch:g(s,r,n),currentValue:o,prevComparisons:x,sameComparisons:d,nextComparisons:c,isExtremum:!0,extremumType:p},f=n*m+r;l.set(f,b),i.push({x:r,y:n,octave:0,scale:a,orientation:0,magnitude:Math.abs(o),siftDescriptor:[],surfDescriptor:[]})}return{keypoints:i,comparisons:l}}(i[e-1],i[e],i[e+1],e),a=t*r**e;for(let e of s.keypoints)e.scale=a;let m=e*o*d;for(let[e,t]of s.comparisons)l.set(m+e,t);n.push(...s.keypoints)}let x=[];for(let t of n){let{magnitudes:s,orientations:a}=u(e,t.x,t.y,8),r=function(e){let t=2*Math.PI/8,s=0;for(let t=1;t<8;t++)e[t]>e[s]&&(s=t);return s*t-Math.PI}(p(s,a,8)),{descriptor:m}=g(s,a,t.x,t.y,r),{descriptor:i}=b(e,t.x,t.y,Math.max(t.scale,1));x.push({...t,orientation:r,magnitude:t.magnitude,siftDescriptor:m,surfDescriptor:i})}x.sort((e,t)=>t.magnitude-e.magnitude);let c=x.slice(0,20),f={gaussianValues:m[0],dogValues:i[0],currentKeypoint:null,gradientMagnitudes:null,gradientOrientations:null,orientationHistogram:null,siftDescriptorGrid:null,surfDescriptorGrid:null,matches:null,neighborComparisons:null};if(c.length>0){let s=Math.min(a,c.length-1),n=c[s],{magnitudes:x,orientations:h}=u(e,n.x,n.y,8),j=p(x,h,8),{grid:y}=g(x,h,n.x,n.y,n.orientation),{grid:N}=b(e,n.x,n.y,Math.max(n.scale,1)),v=Math.round(Math.log(n.scale/t)/Math.log(r))*o*d+n.y*d+n.x,w=l.get(v)??null;f={gaussianValues:m[0],dogValues:i[0],currentKeypoint:n,gradientMagnitudes:x,gradientOrientations:h,orientationHistogram:j,siftDescriptorGrid:y,surfDescriptorGrid:N,matches:[],neighborComparisons:w}}return{keypoints:c,gaussianScales:m,dogScales:i,stepData:f,allSiftDescriptors:c.map(e=>e.siftDescriptor),allSurfDescriptors:c.map(e=>e.surfDescriptor)}}var j=e.i(34928),y=e.i(43082),N=e.i(50192),v=e.i(35126);let w=[{key:"overview",label:"概览",summary:"SIFT 四步流程"},{key:"scale-space",label:"尺度空间",summary:"不同σ看结构"},{key:"dog-detection",label:"DoG检测",summary:"26邻域极值"},{key:"orientation",label:"方向分配",summary:"梯度投票→主方向"},{key:"descriptor",label:"描述子",summary:"128维特征向量"},{key:"matching",label:"特征匹配",summary:"跨图比值检验"}],S=[{value:"rectangle",label:"矩形"},{value:"circle",label:"圆形"},{value:"lenaOriginal",label:"Lena 灰度图"}],F=[{value:"auto",label:"自动匹配"},{value:"rectangle",label:"矩形参考图"},{value:"circle",label:"圆形参考图"},{value:"lenaRotated",label:"旋转缩放(Lena)"}],C=(0,n.buildInlineMathML)("<mrow><mi>L</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo><mo>=</mo><mi>G</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo><mo>*</mo><mi>I</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo></mrow>"),D=(0,n.buildInlineMathML)("<mrow><mi>G</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo><mo>=</mo><mfrac><mn>1</mn><mrow><mn>2</mn><mi>π</mi><msup><mi>σ</mi><mn>2</mn></msup></mrow></mfrac><msup><mi>e</mi><mrow><mo>-</mo><mfrac><mrow><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><msup><mi>y</mi><mn>2</mn></msup></mrow><mrow><mn>2</mn><msup><mi>σ</mi><mn>2</mn></msup></mrow></mfrac></mrow></msup></mrow>"),I=(0,n.buildInlineMathML)("<mrow><mi>D</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo><mo>=</mo><mi>L</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>k</mi><mi>σ</mi><mo>)</mo><mo>-</mo><mi>L</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo></mrow>"),M=(0,n.buildInlineMathML)("<mrow><mi>m</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>=</mo><msqrt><msup><mrow><mo>(</mo><mi>L</mi><mo>(</mo><mi>x</mi><mo>+</mo><mn>1</mn><mo>,</mo><mi>y</mi><mo>)</mo><mo>-</mo><mi>L</mi><mo>(</mo><mi>x</mi><mo>-</mo><mn>1</mn><mo>,</mo><mi>y</mi><mo>)</mo><mo>)</mo></mrow><mn>2</mn></msup><mo>+</mo><msup><mrow><mo>(</mo><mi>L</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>+</mo><mn>1</mn><mo>)</mo><mo>-</mo><mi>L</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>-</mo><mn>1</mn><mo>)</mo><mo>)</mo></mrow><mn>2</mn></msup></msqrt></mrow>"),T=(0,n.buildInlineMathML)("<mrow><mi>θ</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>=</mo><msup><mi>tan</mi><mrow><mo>-</mo><mn>1</mn></mrow></msup><mo>(</mo><mfrac><mrow><mi>L</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>+</mo><mn>1</mn><mo>)</mo><mo>-</mo><mi>L</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>-</mo><mn>1</mn><mo>)</mo></mrow><mrow><mi>L</mi><mo>(</mo><mi>x</mi><mo>+</mo><mn>1</mn><mo>,</mo><mi>y</mi><mo>)</mo><mo>-</mo><mi>L</mi><mo>(</mo><mi>x</mi><mo>-</mo><mn>1</mn><mo>,</mo><mi>y</mi><mo>)</mo></mrow></mfrac><mo>)</mo></mrow>"),k=(0,n.buildInlineMathML)("<mrow><mrow><mo>[</mo><mtable><mtr><mtd><msup><mi>x</mi><mo>′</mo></msup></mtd></mtr><mtr><mtd><msup><mi>y</mi><mo>′</mo></msup></mtd></mtr></mtable><mo>]</mo></mrow><mo>=</mo><mrow><mo>[</mo><mtable><mtr><mtd><mi>cos</mi><mi>θ</mi></mtd><mtd><mo>-</mo><mi>sin</mi><mi>θ</mi></mtd></mtr><mtr><mtd><mi>sin</mi><mi>θ</mi></mtd><mtd><mi>cos</mi><mi>θ</mi></mtd></mtr></mtable><mo>]</mo></mrow><mrow><mo>[</mo><mtable><mtr><mtd><mi>x</mi></mtd></mtr><mtr><mtd><mi>y</mi></mtd></mtr></mtable><mo>]</mo></mrow></mrow>"),G=(0,n.buildInlineMathML)("<mrow><msub><mi>l</mi><mi>j</mi></msub><mo>=</mo><mfrac><msub><mi>w</mi><mi>j</mi></msub><mrow><msqrt><munderover><mo>∑</mo><mrow><mi>i</mi><mo>=</mo><mn>1</mn></mrow><mn>128</mn></munderover><msup><msub><mi>w</mi><mi>i</mi></msub><mn>2</mn></msup></msqrt></mrow></mfrac><mo>,</mo><mi>j</mi><mo>=</mo><mn>1</mn><mo>,</mo><mn>2</mn><mo>,</mo><mo>⋯</mo><mo>,</mo><mn>128</mn></mrow>"),R=(0,n.buildInlineMathML)("<mrow><mi>H</mi><mo>(</mo><mi>X</mi><mo>,</mo><mi>σ</mi><mo>)</mo><mo>=</mo><mrow><mo>[</mo><mtable><mtr><mtd><msub><mi>L</mi><mrow><mi>x</mi><mi>x</mi></mrow></msub><mo>(</mo><mi>X</mi><mo>,</mo><mi>σ</mi><mo>)</mo></mtd><mtd><msub><mi>L</mi><mrow><mi>x</mi><mi>y</mi></mrow></msub><mo>(</mo><mi>X</mi><mo>,</mo><mi>σ</mi><mo>)</mo></mtd></mtr><mtr><mtd><msub><mi>L</mi><mrow><mi>x</mi><mi>y</mi></mrow></msub><mo>(</mo><mi>X</mi><mo>,</mo><mi>σ</mi><mo>)</mo></mtd><mtd><msub><mi>L</mi><mrow><mi>y</mi><mi>y</mi></mrow></msub><mo>(</mo><mi>X</mi><mo>,</mo><mi>σ</mi><mo>)</mo></mtd></mtr></mtable><mo>]</mo></mrow></mrow>"),L=(0,n.buildInlineMathML)("<mrow><mi>det</mi><mo>(</mo><msub><mi>H</mi><mrow><mi>approx</mi></mrow></msub><mo>)</mo><mo>=</mo><msub><mi>D</mi><mrow><mi>x</mi><mi>x</mi></mrow></msub><msub><mi>D</mi><mrow><mi>y</mi><mi>y</mi></mrow></msub><mo>-</mo><mo>(</mo><mi>w</mi><msub><mi>D</mi><mrow><mi>x</mi><mi>y</mi></mrow></msub><msup><mo>)</mo><mn>2</mn></msup></mrow>"),P=(0,n.buildInlineMathML)("<mrow><mi>II</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>=</mo><munderover><mo>∑</mo><mrow><msup><mi>x</mi><mo>′</mo></msup><mo>≤</mo><mi>x</mi></mrow><mrow></mrow></munderover><munderover><mo>∑</mo><mrow><msup><mi>y</mi><mo>′</mo></msup><mo>≤</mo><mi>y</mi></mrow><mrow></mrow></munderover><mi>I</mi><mo>(</mo><msup><mi>x</mi><mo>′</mo></msup><mo>,</mo><msup><mi>y</mi><mo>′</mo></msup><mo>)</mo></mrow>"),K=(0,n.buildInlineMathML)("<mrow><mi>D</mi><mo>(</mo><msub><mi>X</mi><mi>i</mi></msub><mo>,</mo><msub><mi>X</mi><mi>j</mi></msub><mo>)</mo><mo>=</mo><msqrt><munderover><mo>∑</mo><mrow><mi>k</mi><mo>=</mo><mn>0</mn></mrow><mi>n</mi></munderover><msup><mrow><mo>(</mo><msub><mi>X</mi><mrow><mi>i</mi><mi>k</mi></mrow></msub><mo>-</mo><msub><mi>X</mi><mrow><mi>j</mi><mi>k</mi></mrow></msub><mo>)</mo></mrow><mn>2</mn></msup></msqrt></mrow>"),U=(0,n.buildInlineMathML)("<mrow><mtable><mtr><mtd><mi>D</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo><mtext> 为局部极值 </mtext><mo>⟺</mo></mtd></mtr><mtr><mtd><mtext>同层 8 邻域: </mtext><mi>D</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo><mo>&gt;</mo><mi>D</mi><mo>(</mo><mi>x</mi><mo>+</mo><mi>d</mi><mi>x</mi><mo>,</mo><mi>y</mi><mo>+</mo><mi>d</mi><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo><mo>,</mo><mtext> </mtext><mi>d</mi><mi>x</mi><mo>,</mo><mi>d</mi><mi>y</mi><mo>∈</mo><mo>{</mo><mo>-</mo><mn>1</mn><mo>,</mo><mn>0</mn><mo>,</mo><mn>1</mn><mo>}</mo><mo>,</mo><mtext> </mtext><mo>(</mo><mi>d</mi><mi>x</mi><mo>,</mo><mi>d</mi><mi>y</mi><mo>)</mo><mo>≠</mo><mo>(</mo><mn>0</mn><mo>,</mo><mn>0</mn><mo>)</mo></mtd></mtr><mtr><mtd><mtext>上层 9 邻域: </mtext><mi>D</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo><mo>&gt;</mo><mi>D</mi><mo>(</mo><mi>x</mi><mo>+</mo><mi>d</mi><mi>x</mi><mo>,</mo><mi>y</mi><mo>+</mo><mi>d</mi><mi>y</mi><mo>,</mo><mi>k</mi><mi>σ</mi><mo>)</mo><mo>,</mo><mtext> </mtext><mi>d</mi><mi>x</mi><mo>,</mo><mi>d</mi><mi>y</mi><mo>∈</mo><mo>{</mo><mo>-</mo><mn>1</mn><mo>,</mo><mn>0</mn><mo>,</mo><mn>1</mn><mo>}</mo></mtd></mtr><mtr><mtd><mtext>下层 9 邻域: </mtext><mi>D</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo><mo>&gt;</mo><mi>D</mi><mo>(</mo><mi>x</mi><mo>+</mo><mi>d</mi><mi>x</mi><mo>,</mo><mi>y</mi><mo>+</mo><mi>d</mi><mi>y</mi><mo>,</mo><mi>σ</mi><mo>/</mo><mi>k</mi><mo>)</mo><mo>,</mo><mtext> </mtext><mi>d</mi><mi>x</mi><mo>,</mo><mi>d</mi><mi>y</mi><mo>∈</mo><mo>{</mo><mo>-</mo><mn>1</mn><mo>,</mo><mn>0</mn><mo>,</mo><mn>1</mn><mo>}</mo></mtd></mtr><mtr><mtd><mtext>（或全部 </mtext><mo>&lt;</mo><mtext>，为局部极小值）</mtext></mtd></mtr></mtable></mrow>"),H=(0,n.buildInlineMathML)("<mrow><mi>L</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo><mo>=</mo><mi>G</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo><mo>*</mo><mi>I</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>=</mo><mrow><mo>[</mo><mfrac><mn>1</mn><mrow><mn>2</mn><mi>π</mi><msup><mi>σ</mi><mn>2</mn></msup></mrow></mfrac><msup><mi>e</mi><mrow><mo>-</mo><mfrac><mrow><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><msup><mi>y</mi><mn>2</mn></msup></mrow><mrow><mn>2</mn><msup><mi>σ</mi><mn>2</mn></msup></mrow></mfrac></mrow></msup><mo>]</mo></mrow><mo>*</mo><mi>I</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo></mrow>"),z=(0,n.buildInlineMathML)("<mrow><msub><mi>d</mi><mi>x</mi></msub><mo>=</mo><munder><mo>∑</mo><mrow></mrow></munder><mi>I</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>·</mo><msub><mi>W</mi><mi>x</mi></msub><mo>,</mo><mtext> </mtext><msub><mi>d</mi><mi>y</mi></msub><mo>=</mo><munder><mo>∑</mo><mrow></mrow></munder><mi>I</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>·</mo><msub><mi>W</mi><mi>y</mi></msub></mrow>");function q({hist:e,highlightBin:s}){let a=Math.max(...e,.01);return(0,t.jsx)("div",{className:"grid grid-cols-8 gap-1",children:e.map((e,r)=>(0,t.jsxs)("div",{className:"flex flex-col items-center",children:[(0,t.jsx)("div",{className:"flex h-20 w-full items-end justify-center",children:(0,t.jsx)("div",{className:"w-full rounded-t "+(s===r?"bg-amber-500":"bg-amber-400"),style:{height:Math.max(e/a*100,5)+"%"}})}),(0,t.jsxs)("span",{className:"mt-1 text-[9px] text-slate-500",children:[45*r,"°"]})]},r))})}function A({grid:e,label:s}){if(0===e.length)return null;let a=Math.max(...e.flat(),.01);return(0,t.jsxs)("div",{className:"space-y-1",children:[(0,t.jsx)("div",{className:"text-[10px] font-medium text-slate-500",children:s}),(0,t.jsx)("div",{className:"grid grid-cols-4 gap-1",children:e.map((e,s)=>(0,t.jsxs)("div",{className:"rounded border border-slate-200 bg-white p-1",children:[(0,t.jsxs)("div",{className:"text-[8px] text-slate-400",children:["R",s]}),(0,t.jsx)("div",{className:"mt-0.5 grid grid-cols-1 gap-0.5",children:e.map((e,s)=>(0,t.jsxs)("div",{className:"flex items-center gap-0.5",children:[(0,t.jsx)("div",{className:"h-1.5 flex-1 rounded",style:{backgroundColor:"rgba(251, 146, 60, "+Math.max(e/a,.05)+")"}}),(0,t.jsx)("span",{className:"w-5 text-right text-[7px] font-mono text-slate-500",children:e.toFixed(1)})]},s))})]},s))})]})}function O({data:e}){let s=(e,s,a,r)=>{let m=a.filter(e=>"greater"===e.relation).length,i=Math.max(...e.flat().map(Math.abs),.001);return(0,t.jsxs)("div",{className:"flex flex-col items-center",children:[(0,t.jsx)("div",{className:"mb-1 text-[10px] font-semibold text-slate-500",children:s}),(0,t.jsx)("div",{className:"grid grid-cols-3 gap-0.5",children:e.map((e,s)=>e.map((e,a)=>{let m=1===s&&1===a,l=Math.min(Math.abs(e)/i,1),n=e>0?`rgba(16,185,129,${.08+.55*l})`:e<0?`rgba(239,68,68,${.08+.55*l})`:"white";return(0,t.jsxs)("div",{className:"flex h-7 w-14 items-center justify-center text-[10px] font-mono font-semibold",style:{backgroundColor:n,border:r&&m?"2px solid rgb(239,68,68)":"1px solid rgb(226,232,240)",borderRadius:r&&m?"3px":"0"},children:[e>0?"+":"",e.toFixed(2)]},`${s}-${a}`)}))}),(0,t.jsxs)("div",{className:"mt-1 text-[10px] text-slate-500",children:[m,"/",a.length," 当前值更大"]})]})};return(0,t.jsxs)("div",{className:"space-y-3",children:[(0,t.jsxs)("div",{className:"flex flex-wrap justify-center gap-3",children:[s(e.prevDogPatch,"下层 DoG (σ/k)",e.prevComparisons,!1),s(e.currentDogPatch,"当前层 DoG (σ)",e.sameComparisons,!0),s(e.nextDogPatch,"上层 DoG (kσ)",e.nextComparisons,!1)]}),(0,t.jsx)("div",{className:"rounded-xl border px-4 py-2 text-center text-xs font-semibold "+(e.isExtremum?"border-emerald-200 bg-emerald-50 text-emerald-800":"border-red-200 bg-red-50 text-red-700"),children:e.isExtremum?`✓ 局部${"max"===e.extremumType?"极大":"极小"}值 — 全部 26 邻域比较通过，当前点为候选关键点`:"✗ 非极值 — 未通过 26 邻域比较，当前点被排除"})]})}function V({activeStage:e,onStageChange:s,stageIndex:a}){return(0,t.jsx)("div",{className:"space-y-1.5",children:w.map((r,m)=>{let i=r.key===e,l=m<a;return(0,t.jsxs)("button",{type:"button",onClick:()=>s(r.key),className:"w-full rounded-xl border px-3 py-2 text-left transition "+(i?"border-amber-300 bg-amber-50 text-amber-800":l?"border-slate-200 bg-white text-slate-700":"border-slate-200 bg-slate-50 text-slate-500"),children:[(0,t.jsxs)("div",{className:"flex items-center gap-2",children:[(0,t.jsx)("span",{className:"flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold "+(i?"bg-amber-600 text-white":l?"bg-slate-700 text-white":"border border-slate-300 bg-white text-slate-500"),children:l?"✓":m+1}),(0,t.jsx)("span",{className:"text-sm font-semibold",children:r.label})]}),(0,t.jsx)("div",{className:"mt-1 pl-8 text-xs leading-5",children:r.summary})]},r.key)})})}function $({activeTab:e,onChange:s}){return(0,t.jsxs)("div",{className:"flex items-center",children:[(0,t.jsx)("div",{className:"flex rounded-xl border border-slate-200 bg-slate-100 p-0.5",children:[{key:"sift",label:"SIFT 视角"},{key:"surf",label:"SURF 视角"},{key:"compare",label:"对比表"}].map(a=>(0,t.jsx)("button",{type:"button",onClick:()=>s(a.key),className:"rounded-lg px-3 py-1.5 text-xs font-semibold transition "+(e===a.key?"bg-white text-slate-800 shadow-sm":"text-slate-500 hover:text-slate-700"),children:a.label},a.key))}),"sift"===e&&(0,t.jsx)("span",{className:"ml-3 text-[11px] text-amber-600",children:"💡 SURF 用积分图加速 → 点击 SURF 标签查看"})]})}function B(){return(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"SIFT vs SURF 全流程对比"}),(0,t.jsx)("div",{className:"mt-3 w-full overflow-x-auto",children:(0,t.jsxs)("table",{className:"w-full border-collapse text-[11px]",children:[(0,t.jsx)("thead",{children:(0,t.jsxs)("tr",{className:"border-b border-slate-300",children:[(0,t.jsx)("th",{className:"px-3 py-2 text-left font-semibold text-slate-700",children:"特性"}),(0,t.jsx)("th",{className:"px-3 py-2 text-left font-semibold text-slate-700",children:"SIFT"}),(0,t.jsx)("th",{className:"px-3 py-2 text-left font-semibold text-slate-700",children:"SURF"})]})}),(0,t.jsx)("tbody",{children:[{feature:"尺度空间",sift:"标准：octave 降采样改变图像大小<br/>本页实现：固定图像尺寸、改变 σ（教学简化）",surf:"固定图像大小，不同尺度 box filter"},{feature:"特征点检测",sift:"DoG 非极大抑制 + 26 邻域",surf:"Hessian 行列式 + 非极大抑制"},{feature:"方向",sift:"正方形区域梯度直方图（36柱）",surf:"圆形区域 Haar 小波，扇形滑动"},{feature:"描述子邻域",sift:"16x16",surf:"20s x 20s"},{feature:"描述子维数",sift:"128",surf:"64"},{feature:"描述方法",sift:"8方向梯度直方图",surf:"&Sigma;dx, &Sigma;|dx|, &Sigma;dy, &Sigma;|dy|"},{feature:"不变性",sift:"尺度+旋转+光照",surf:"尺度+旋转+光照"},{feature:"速度",sift:"较慢",surf:"较快（积分图加速）"}].map((e,s)=>(0,t.jsxs)("tr",{className:"border-b border-slate-200",children:[(0,t.jsx)("td",{className:"px-3 py-1.5 font-medium text-slate-600",children:e.feature}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",dangerouslySetInnerHTML:{__html:e.sift}}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",dangerouslySetInnerHTML:{__html:e.surf}})]},s))})]})})]})}let E=`// 以下代码截取自 src/lib/algorithms/siftSurf.ts，展示核心实现
/**
 * SIFT / SURF 尺度特征教学演示算法
 *
 * 为教学目的提供简化的 SIFT/SURF 特征检测与描述模拟。
 * 核心流程包括：
 *   - 高斯尺度空间构建
 *   - DoG 尺度空间构建
 *   - 空间极值点检测（26 邻域）
 *   - 方向分配（梯度直方图）
 *   - 描述子生成（SIFT 128D / SURF 64D）
 *   - 最近邻比值匹配
 */

import { GrayscaleImage } from './types';
import { create2DArray } from '../utils/imageProcessing';

// ==================== 类型定义 ====================

/** 一个简易关键点 */
export interface SiftKeypoint {
  x: number;
  y: number;
  octave: number;
  scale: number;
  /** 主方向（弧度） */
  orientation: number;
  /** 幅值 */
  magnitude: number;
  /** SIFT 128 维描述子 */
  siftDescriptor: number[];
  /** SURF 64 维描述子 */
  surfDescriptor: number[];
}

/** 单个邻居点的比较结果：relation 描述当前像素与该邻居的 DoG 值关系 */
export interface NeighborComparison {
  dx: number;
  dy: number;
  value: number;
  relation: 'greater' | 'less' | 'equal';
}

/** 26 邻域跨尺度比较明细 */
export interface NeighborComparisonsData {
  prevDogPatch: number[][];       // 上层 DoG 3\xd73 patch
  currentDogPatch: number[][];    // 当前层 DoG 3\xd73 patch
  nextDogPatch: number[][];       // 下层 DoG 3\xd73 patch
  currentValue: number;
  prevComparisons: NeighborComparison[];   // 上层 9 个邻居
  sameComparisons: NeighborComparison[];   // 同层 8 个邻居
  nextComparisons: NeighborComparison[];   // 下层 9 个邻居
  isExtremum: boolean;
  extremumType: 'max' | 'min' | 'none';
}

/** SIFT 当前步骤的上下文数据 */
export interface SiftStepData {
  gaussianValues: number[][];
  dogValues: number[][];
  currentKeypoint: SiftKeypoint | null;
  gradientMagnitudes: number[][] | null;
  gradientOrientations: number[][] | null;
  orientationHistogram: number[] | null;
  siftDescriptorGrid: number[][] | null;
  surfDescriptorGrid: number[][] | null;
  matches: Array<{ queryIdx: number; trainIdx: number; distance: number }> | null;
  /** 选中关键点的 26 邻域跨尺度比较明细，用于教学可视化 */
  neighborComparisons: NeighborComparisonsData | null;
}

// ==================== 尺度空间辅助 ====================

function gaussianBlur(image: GrayscaleImage, sigma: number): GrayscaleImage {
  const h = image.length;
  const w = image[0]?.length ?? 0;
  if (h === 0 || w === 0) return image;

  const radius = Math.ceil(2 * sigma);
  const size = 2 * radius + 1;
  const kernel = new Array<number>(size);
  let sum = 0;
  for (let i = 0; i < size; i++) {
    const x = i - radius;
    kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
    sum += kernel[i];
  }
  for (let i = 0; i < size; i++) kernel[i] /= sum;

  const temp = create2DArray(h, w, 0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let val = 0;
      for (let k = 0; k < size; k++) {
        const sx = x + k - radius;
        if (sx >= 0 && sx < w) val += image[y][sx] * kernel[k];
      }
      temp[y][x] = val;
    }
  }

  const result = create2DArray(h, w, 0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let val = 0;
      for (let k = 0; k < size; k++) {
        const sy = y + k - radius;
        if (sy >= 0 && sy < h) val += temp[sy][x] * kernel[k];
      }
      result[y][x] = val;
    }
  }

  return result;
}

function computeGaussianScale(image: GrayscaleImage, sigma: number): GrayscaleImage {
  return gaussianBlur(image, sigma);
}

function computeDoG(l1: GrayscaleImage, l2: GrayscaleImage): GrayscaleImage {
  const h = l1.length;
  const w = l1[0]?.length ?? 0;
  const result = create2DArray(h, w, 0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      result[y][x] = l2[y][x] - l1[y][x];
    }
  }
  return result;
}

// ==================== 关键点检测 ====================

/**
 * 真正的 26 邻域跨尺度极值检测
 *
 * 对 currDog 中的每个像素，与以下邻居比较：
 *   - 同层 8 邻域（3\xd73 去中心）
 *   - 前一层 prevDog 的 9 邻域（序号 s-1，σ 更小，相对更清晰）
 *   - 后一层 nextDog 的 9 邻域（序号 s+1，σ 更大，相对更模糊）
 * 总共 26 个比较。只有当前值严格大于（或严格小于）全部 26 个邻居时，
 * 才被判定为候选关键点。
 *
 * @param prevDog 前一层 DoG 图像（序号 s-1，σ 更小，相对更清晰）
 * @param currDog 当前层 DoG 图像（序号 s）
 * @param nextDog 后一层 DoG 图像（序号 s+1，σ 更大，相对更模糊）
 * @param octave  所在八度（多八度场景用，当前教学固定为 0）
 * @param scaleIndex DoG 尺度序号（用于记录关键点来源）
 * @returns 检测到的关键点列表 + 每个关键点的比较明细 Map
 */
function detectExtremaCrossScale(
  prevDog: GrayscaleImage,
  currDog: GrayscaleImage,
  nextDog: GrayscaleImage,
  octave: number,
  scaleIndex: number
): { keypoints: SiftKeypoint[]; comparisons: Map<number, NeighborComparisonsData> } {
  const h = currDog.length;
  const w = currDog[0]?.length ?? 0;
  const keypoints: SiftKeypoint[] = [];
  const comparisons = new Map<number, NeighborComparisonsData>();

  // 最小 DoG 绝对值阈值：过滤纯噪声区域
  const DOG_THRESHOLD = 0.005;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const currentValue = currDog[y][x];

      // Task 3: 绝对值过小的点视为噪声，跳过
      if (Math.abs(currentValue) < DOG_THRESHOLD) continue;

      const sameComparisons: NeighborComparison[] = [];
      const prevComparisons: NeighborComparison[] = [];
      const nextComparisons: NeighborComparison[] = [];

      let allGreater = true;  // 当前值 > 全部 26 个邻居 → 极大值
      let allLess = true;     // 当前值 < 全部 26 个邻居 → 极小值

      // ---- 同层 8 邻域比较 ----
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nv = currDog[y + dy][x + dx];
          let relation: 'greater' | 'less' | 'equal';
          if (currentValue > nv) { relation = 'greater'; }
          else if (currentValue < nv) { relation = 'less'; allGreater = false; }
          else { relation = 'equal'; allGreater = false; allLess = false; }
          // 仅当 nv >= currentValue 时才非极大值
          if (nv >= currentValue) allGreater = false;
          // 仅当 nv <= currentValue 时才非极小值
          if (nv <= currentValue) allLess = false;
          sameComparisons.push({ dx, dy, value: nv, relation });
        }
      }

      // 同层已无法判定极值 → 跳过
      if (!allGreater && !allLess) continue;

      // ---- 上层 9 邻域比较 ----
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nv = prevDog[y + dy][x + dx];
          let relation: 'greater' | 'less' | 'equal';
          if (currentValue > nv) { relation = 'greater'; }
          else if (currentValue < nv) { relation = 'less'; allGreater = false; }
          else { relation = 'equal'; allGreater = false; allLess = false; }
          if (nv >= currentValue) allGreater = false;
          if (nv <= currentValue) allLess = false;
          prevComparisons.push({ dx, dy, value: nv, relation });
        }
      }

      if (!allGreater && !allLess) continue;

      // ---- 下层 9 邻域比较 ----
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nv = nextDog[y + dy][x + dx];
          let relation: 'greater' | 'less' | 'equal';
          if (currentValue > nv) { relation = 'greater'; }
          else if (currentValue < nv) { relation = 'less'; allGreater = false; }
          else { relation = 'equal'; allGreater = false; allLess = false; }
          if (nv >= currentValue) allGreater = false;
          if (nv <= currentValue) allLess = false;
          nextComparisons.push({ dx, dy, value: nv, relation });
        }
      }

      if (!allGreater && !allLess) continue;

      // ---- 通过全部 26 邻域比较，确定为极值点 ----
      const extremumType: 'max' | 'min' | 'none' = allGreater ? 'max' : 'min';

      // 提取三层 DoG 的 3\xd73 patch
      const extract3x3 = (img: GrayscaleImage, cx: number, cy: number): number[][] => {
        const patch: number[][] = [];
        for (let dy = -1; dy <= 1; dy++) {
          const row: number[] = [];
          for (let dx = -1; dx <= 1; dx++) {
            row.push(img[cy + dy][cx + dx]);
          }
          patch.push(row);
        }
        return patch;
      };

      const comparisonsData: NeighborComparisonsData = {
        prevDogPatch: extract3x3(prevDog, x, y),
        currentDogPatch: extract3x3(currDog, x, y),
        nextDogPatch: extract3x3(nextDog, x, y),
        currentValue,
        prevComparisons,
        sameComparisons,
        nextComparisons,
        isExtremum: true,
        extremumType,
      };

      // 用 y * w + x 作为局部 key
      const localKey = y * w + x;
      comparisons.set(localKey, comparisonsData);

      keypoints.push({
        x, y, octave, scale: scaleIndex,
        orientation: 0, magnitude: Math.abs(currentValue),
        siftDescriptor: [], surfDescriptor: [],
      });
    }
  }

  return { keypoints, comparisons };
}

// ==================== 梯度与方向 ====================

function computeGradients(
  image: GrayscaleImage, cx: number, cy: number, radius: number
): { magnitudes: number[][]; orientations: number[][] } {
  const size = 2 * radius + 1;
  const magnitudes = create2DArray(size, size, 0);
  const orientations = create2DArray(size, size, 0);
  const w = image[0]?.length ?? 0;
  const h = image.length;

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const px = cx + dx, py = cy + dy;
      const ri = dy + radius, ci = dx + radius;
      if (px <= 0 || px >= w - 1 || py <= 0 || py >= h - 1) continue;
      const gx = image[py][px + 1] - image[py][px - 1];
      const gy = image[py + 1][px] - image[py - 1][px];
      magnitudes[ri][ci] = Math.sqrt(gx * gx + gy * gy);
      orientations[ri][ci] = Math.atan2(gy, gx);
    }
  }
  return { magnitudes, orientations };
}

function computeOrientationHistogram(magnitudes: number[][], orientations: number[][], radius: number): number[] {
  const hist = new Array<number>(8).fill(0);
  const binSize = (2 * Math.PI) / 8;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const ri = dy + radius, ci = dx + radius;
      const bin = Math.floor((orientations[ri][ci] + Math.PI) / binSize) % 8;
      const weight = Math.exp(-(dx * dx + dy * dy) / (2 * (radius * 0.5) ** 2));
      hist[bin] += magnitudes[ri][ci] * weight;
    }
  }
  const hSum = hist.reduce((a, b) => a + b, 0);
  if (hSum > 0) { for (let i = 0; i < 8; i++) hist[i] /= hSum; }
  return hist;
}

function findDominantOrientation(hist: number[]): number {
  const binSize = (2 * Math.PI) / 8;
  let maxBin = 0;
  for (let i = 1; i < 8; i++) { if (hist[i] > hist[maxBin]) maxBin = i; }
  return maxBin * binSize - Math.PI;
}

// ==================== 描述子生成 ====================

function computeSiftDescriptor(
  magnitudes: number[][], orientations: number[][],
  kpX: number, kpY: number, orientation: number
): { descriptor: number[]; grid: number[][] } {
  const descriptor: number[] = [];
  const grid: number[][] = [];
  const subSize = 4;

  for (let sr = 0; sr < 4; sr++) {
    for (let sc = 0; sc < 4; sc++) {
      const hist = new Array<number>(8).fill(0);
      const cR = kpY + (sr - 1.5) * subSize;
      const cC = kpX + (sc - 1.5) * subSize;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const py = Math.round(cR + dy), px = Math.round(cC + dx);
          const ri = py - (kpY - 8), ci = px - (kpX - 8);
          if (ri < 0 || ri >= orientations.length || ci < 0 || ci >= (orientations[0]?.length ?? 0)) continue;
          const mag = magnitudes[ri][ci], orient = orientations[ri][ci];
          const rawBin = Math.floor((orient - orientation + Math.PI) / (Math.PI / 4));
          const bin = ((rawBin % 8) + 8) % 8;  // JS % 是余数，负数需修正
          const dist = Math.sqrt((sr - 1.5 + dy / subSize) ** 2 + (sc - 1.5 + dx / subSize) ** 2);
          hist[bin] += mag * Math.exp(-dist * dist / 2);
        }
      }
      const hSum = hist.reduce((a, b) => a + b, 0);
      if (hSum > 0) { for (let i = 0; i < 8; i++) hist[i] /= hSum; }
      descriptor.push(...hist);
      grid.push(hist);
    }
  }
  // 最终 L2 归一化：标准 SIFT 对 128 维向量整体归一化
  const norm = Math.sqrt(descriptor.reduce((s, v) => s + v * v, 0));
  if (norm > 0) {
    for (let i = 0; i < descriptor.length; i++) descriptor[i] /= norm;
    for (let r = 0; r < 16; r++) for (let c = 0; c < 8; c++) grid[r][c] /= norm;
  }
  return { descriptor, grid };
}

function computeSurfDescriptor(image: GrayscaleImage, kpX: number, kpY: number, scale: number): { descriptor: number[]; grid: number[][] } {
  const descriptor: number[] = [];
  const grid: number[][] = [];
  const sz = 20 * scale, step = sz / 4;
  const w = image[0]?.length ?? 0, h = image.length;

  for (let sr = 0; sr < 4; sr++) {
    for (let sc = 0; sc < 4; sc++) {
      const cx = kpX + (sc - 1.5) * step, cy = kpY + (sr - 1.5) * step;
      let dxSum = 0, dySum = 0, dxAbs = 0, dyAbs = 0;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const px = Math.round(cx + dx), py = Math.round(cy + dy);
          if (px <= 0 || px >= w - 1 || py <= 0 || py >= h - 1) continue;
          const gx = image[py][px + 1] - image[py][px - 1];
          const gy = image[py + 1][px] - image[py - 1][px];
          dxSum += gx; dySum += gy; dxAbs += Math.abs(gx); dyAbs += Math.abs(gy);
        }
      }
      descriptor.push(dxSum, dySum, dxAbs, dyAbs);
      grid.push([dxSum, dySum, dxAbs, dyAbs]);
    }
  }
  const norm = Math.sqrt(descriptor.reduce((s, v) => s + v * v, 0));
  if (norm > 0) {
    for (let i = 0; i < descriptor.length; i++) descriptor[i] /= norm;
    for (let r = 0; r < 16; r++) for (let c = 0; c < 4; c++) grid[r][c] /= norm;
  }
  return { descriptor, grid };
}

function findMatches(descriptors1: number[][], descriptors2: number[][], ratio: number): Array<{ queryIdx: number; trainIdx: number; distance: number }> {
  const matches: Array<{ queryIdx: number; trainIdx: number; distance: number }> = [];
  for (let i = 0; i < descriptors1.length; i++) {
    const d1 = descriptors1[i];
    const dists = descriptors2.map((d2, j) => {
      const d = d1.reduce((s, v, k) => s + (v - d2[k]) ** 2, 0);
      return { idx: j, dist: d };
    }).sort((a, b) => a.dist - b.dist);
    if (dists.length >= 2 && Math.sqrt(dists[0].dist) / Math.sqrt(Math.max(dists[1].dist, 1e-10)) < ratio) {
      matches.push({ queryIdx: i, trainIdx: dists[0].idx, distance: Math.sqrt(dists[0].dist) });
    }
  }
  return matches;
}

// ==================== 主生成函数 ====================

export interface SiftSurfResult {
  keypoints: SiftKeypoint[];
  gaussianScales: GrayscaleImage[];
  dogScales: GrayscaleImage[];
  stepData: SiftStepData;
  allSiftDescriptors: number[][];
  allSurfDescriptors: number[][];
}

export function computeSiftSurf(
  image: GrayscaleImage, sigma: number, numScales: number, selectedKp: number
): SiftSurfResult {
  const kFactor = 2 ** (1 / Math.max(numScales, 1));

  // 为 26 邻域检测补充额外层：标准 SIFT 每个 octave 需要 S+3 张高斯图以得到 S 个可检测层。
  // 本教学实现固定图像尺寸，因此至少构造 numScales + 2 张高斯图，得到 numScales + 1 张 DoG，
  // 从而保证中间可检测层数为 numScales - 1（≥ 2 当 numScales ≥ 3）。
  const gaussianScales: GrayscaleImage[] = [];
  for (let s = 0; s < numScales + 2; s++) {
    gaussianScales.push(computeGaussianScale(image, sigma * (kFactor ** s)));
  }

  const dogScales: GrayscaleImage[] = [];
  for (let s = 0; s < numScales + 1; s++) {
    dogScales.push(computeDoG(gaussianScales[s], gaussianScales[s + 1]));
  }

  // ---- 使用 detectExtremaCrossScale 进行 26 邻域跨尺度极值检测 ----
  const allComparisons = new Map<number, NeighborComparisonsData>();
  const allKeypoints: SiftKeypoint[] = [];
  const dogH = dogScales[0]?.length ?? image.length;
  const dogW = dogScales[0]?.[0]?.length ?? image[0]?.length ?? 64;
  for (let s = 1; s < dogScales.length - 1; s++) {
    const result = detectExtremaCrossScale(
      dogScales[s - 1], dogScales[s], dogScales[s + 1], 0, s
    );
    // 将关键点 scale 从索引修正为实际高斯 σ 值
    const actualSigma = sigma * (kFactor ** s);
    for (const kp of result.keypoints) {
      kp.scale = actualSigma;
    }
    // 使用复合 key：scale * h * w + y * w + x，支持跨尺度查找
    const scaleOffset = s * dogH * dogW;
    for (const [localKey, data] of result.comparisons) {
      allComparisons.set(scaleOffset + localKey, data);
    }
    allKeypoints.push(...result.keypoints);
  }

  const keypoints: SiftKeypoint[] = [];
  for (const kp of allKeypoints) {
    const radius = 8;
    const { magnitudes, orientations } = computeGradients(image, kp.x, kp.y, radius);
    const hist = computeOrientationHistogram(magnitudes, orientations, radius);
    const mainOrient = findDominantOrientation(hist);
    const { descriptor: siftDesc } = computeSiftDescriptor(magnitudes, orientations, kp.x, kp.y, mainOrient);
    const { descriptor: surfDesc } = computeSurfDescriptor(image, kp.x, kp.y, Math.max(kp.scale, 1));
    keypoints.push({ ...kp, orientation: mainOrient, magnitude: kp.magnitude, siftDescriptor: siftDesc, surfDescriptor: surfDesc });
  }

  keypoints.sort((a, b) => b.magnitude - a.magnitude);
  const topKeypoints = keypoints.slice(0, 20);

  let stepData: SiftStepData = {
    gaussianValues: gaussianScales[0], dogValues: dogScales[0],
    currentKeypoint: null, gradientMagnitudes: null, gradientOrientations: null,
    orientationHistogram: null, siftDescriptorGrid: null, surfDescriptorGrid: null, matches: null,
    neighborComparisons: null,
  };

  if (topKeypoints.length > 0) {
    const idx = Math.min(selectedKp, topKeypoints.length - 1);
    const kp = topKeypoints[idx];
    const radius = 8;
    const { magnitudes, orientations } = computeGradients(image, kp.x, kp.y, radius);
    const hist = computeOrientationHistogram(magnitudes, orientations, radius);
    const { grid: siftGrid } = computeSiftDescriptor(magnitudes, orientations, kp.x, kp.y, kp.orientation);
    const { grid: surfGrid } = computeSurfDescriptor(image, kp.x, kp.y, Math.max(kp.scale, 1));
    // 跨图匹配由 computeSiftSurfMatching 负责，基础函数不生成自匹配结果
    const matches: Array<{ queryIdx: number; trainIdx: number; distance: number }> = [];

    // 查找选中关键点的 26 邻域比较明细
    // kp.scale 已存为实际 σ 值，需反推尺度索引来查表
    const kpScaleIndex = Math.round(Math.log(kp.scale / sigma) / Math.log(kFactor));
    const cmpKey = kpScaleIndex * dogH * dogW + kp.y * dogW + kp.x;
    const neighborComparisons = allComparisons.get(cmpKey) ?? null;

    stepData = {
      gaussianValues: gaussianScales[0], dogValues: dogScales[0],
      currentKeypoint: kp, gradientMagnitudes: magnitudes, gradientOrientations: orientations,
      orientationHistogram: hist, siftDescriptorGrid: siftGrid, surfDescriptorGrid: surfGrid, matches,
      neighborComparisons,
    };
  }

  return {
    keypoints: topKeypoints, gaussianScales, dogScales, stepData,
    allSiftDescriptors: topKeypoints.map(k => k.siftDescriptor),
    allSurfDescriptors: topKeypoints.map(k => k.surfDescriptor),
  };
}

// ==================== 跨图像匹配 ====================

/** 跨图像匹配的完整结果，SiftSurfResult 的超集 */
export interface SiftSurfMatchingResult extends SiftSurfResult {
  referenceKeypoints: SiftKeypoint[];
  referenceDescriptors: number[][];
}

/**
 * 对 queryImage 和 referenceImage 分别执行 SIFT 检测，然后进行跨图像描述子匹配。
 *
 * @param queryImage      待匹配图像
 * @param referenceImage  参考图像
 * @param sigma           初始尺度
 * @param numScales       每组层数
 * @param selectedKp      查询图中选中的关键点序号
 * @returns               包含双方关键点、描述子和匹配结果的 SiftSurfMatchingResult
 */
export function computeSiftSurfMatching(
  queryImage: GrayscaleImage,
  referenceImage: GrayscaleImage,
  sigma: number,
  numScales: number,
  selectedKp: number
): SiftSurfMatchingResult {
  const queryResult = computeSiftSurf(queryImage, sigma, numScales, selectedKp);
  const refResult = computeSiftSurf(referenceImage, sigma, numScales, 0);

  // 跨图像匹配：查询图描述子 vs 参考图描述子
  const matches = findMatches(
    queryResult.allSiftDescriptors,
    refResult.allSiftDescriptors,
    0.8
  );

  // 覆盖 stepData 中的 matches（原为自匹配结果）
  const stepData: SiftStepData = {
    ...queryResult.stepData,
    matches,
  };

  return {
    ...queryResult,
    stepData,
    referenceKeypoints: refResult.keypoints,
    referenceDescriptors: refResult.allSiftDescriptors,
  };
}
`;function X(e,t,s){let a=e.length,r=e[0]?.length??0,m=e.map(e=>[...e]);for(let e=0;e<t.length;e++){let i=t[e],l=e===s;for(let e=-1;e<=1;e++)for(let t=-1;t<=1;t++){let s=i.x+t,n=i.y+e;s>=0&&s<r&&n>=0&&n<a&&(m[n][s]=l?1:.7)}}return m}e.s(["default",0,function(){let[e,h]=(0,s.useState)("overview"),[u,p]=(0,s.useState)("sift"),[g,b]=(0,s.useState)("rectangle"),[_,W]=(0,s.useState)(1),[Y,J]=(0,s.useState)(3),[Q,Z]=(0,s.useState)(0),[ee,et]=(0,s.useState)({x:16,y:16}),[es,ea]=(0,s.useState)("auto"),[er,em]=(0,s.useState)(!1),ei=(0,N.useLenaGrayscaleImage)(96);(0,s.useEffect)(()=>{p("sift")},[e]),(0,s.useEffect)(()=>{er||ea("auto")},[g,er]);let el=(0,s.useMemo)(()=>{switch(g){case"rectangle":default:return(0,j.createRectangleImage)();case"circle":return(0,j.createCircleImage)();case"lenaOriginal":return ei??(0,j.createRectangleImage)()}},[g,ei]),{keypoints:en,gaussianScales:eo,dogScales:ed,stepData:ex}=(0,s.useMemo)(()=>f(el,_,Y,Q),[el,_,Y,Q]);(0,s.useEffect)(()=>{ex.currentKeypoint&&et({x:ex.currentKeypoint.x,y:ex.currentKeypoint.y})},[ex.currentKeypoint]);let ec=(0,s.useMemo)(()=>{if("matching"!==e)return null;let t="auto"===es?g:"lenaRotated"===es?"lenaOriginal":es;return(0,j.createReferenceImage)(el,t)},[el,g,e,es]),eh=(0,s.useMemo)(()=>{var t;let s,a,r,m;return"matching"===e&&ec?(t=ec.image,s=f(el,_,Y,Q),a=f(t,_,Y,0),r=function(e,t){let s=[];for(let a=0;a<e.length;a++){let r=e[a],m=t.map((e,t)=>({idx:t,dist:r.reduce((t,s,a)=>t+(s-e[a])**2,0)})).sort((e,t)=>e.dist-t.dist);m.length>=2&&Math.sqrt(m[0].dist)/Math.sqrt(Math.max(m[1].dist,1e-10))<.8&&s.push({queryIdx:a,trainIdx:m[0].idx,distance:Math.sqrt(m[0].dist)})}return s}(s.allSiftDescriptors,a.allSiftDescriptors),m={...s.stepData,matches:r},{...s,stepData:m,referenceKeypoints:a.keypoints,referenceDescriptors:a.allSiftDescriptors}):null},[el,ec,_,Y,Q,e]),eu=(0,s.useMemo)(()=>X(el,en,Q),[el,en,Q]),ep=(0,s.useMemo)(()=>eh&&ec?X(ec.image,eh.referenceKeypoints,-1):null,[eh,ec]),eg=ex.currentKeypoint,eb=(0,s.useMemo)(()=>eh?.stepData.matches??ex.matches??[],[eh,ex.matches]),ef=(eb.length,ex.neighborComparisons),ej=function(e){switch(e){case"scale-space":return[{term:"尺度空间",explanation:"尺度空间就是同一张图在不同模糊尺度下的表示，用来观察不同大小结构。"}];case"dog-detection":return[{term:"DoG",explanation:"DoG 是相邻两层高斯模糊图相减后的响应图，用来突出局部结构变化。"},{term:"26 邻域",explanation:"26 邻域表示同一点在上、中、下三层周围一共 26 个邻居，要同时比较它们。"}];case"orientation":return[{term:"主方向",explanation:"主方向是当前关键点邻域中梯度投票最多的方向，用来消除旋转影响。"}];default:return[]}}(e),ey=function(e,t,s){if(!t&&"overview"!==e)return"当前没有可用关键点，请先切换图像或调整参数。";switch(e){case"scale-space":return`关键点 (${t.x}, ${t.y}) 在 σ=${t.scale.toFixed(2)} 处被检出。不同 σ 下的高斯响应揭示该局部结构的尺度稳定性：若同一结构跨 3 层以上仍保持相似的 DoG 响应轮廓，则被判定为稳定候选点。`;case"dog-detection":if(s){let e=s.prevComparisons.filter(e=>"greater"===e.relation).length,t=s.sameComparisons.filter(e=>"greater"===e.relation).length,a=s.nextComparisons.filter(e=>"greater"===e.relation).length,r=s.prevComparisons.length+s.sameComparisons.length+s.nextComparisons.length,m=e+t+a;return`26 邻域比较：DoG 值 ${s.currentValue.toFixed(4)} vs 上层 ${e}/9 邻居 + 同层 ${t}/8 邻居 + 下层 ${a}/9 邻居 → ${m===r?"极大值（全部大于）":0===m?"极小值（全部小于）":"非极值"}`}return"DoG 极值检测通过 26 邻域跨尺度比较：同一点在上/中/下三层 DoG 中必须同时大于（或同时小于）全部 26 个邻居。";case"orientation":return`以关键点 (${t.x}, ${t.y}) 为中心计算 17\xd717 邻域梯度，按 8 方向加权投票。主方向 ${(180*t.orientation/Math.PI).toFixed(0)}\xb0 是梯度投票最多的方向。`;case"descriptor":return"16×16 邻域划分为 4×4=16 个子区域，每个子区域统计 8 方向梯度累加 → 128 维向量。L2 归一化消除光照影响，坐标旋转到主方向消除旋转影响。当前实现为教学简化版，子区域采样密度低于标准 SIFT。";case"matching":return"对查询图中的每个关键点描述子，在参考图中找欧氏距离最近和次近的两个候选。实现中对平方欧氏距离做比值检验：d₁² / d₂² < 0.8（等价于欧氏距离比 d₁ / d₂ < √0.8 ≈ 0.894），通过则为可靠匹配。";default:return"从概览进入任一步骤，检查关键点如何一路从候选点变成可匹配特征。每一步的证据都基于具体数值和判定结果。"}}(e,eg,ex.neighborComparisons),eN=function(e,t,s,a){if(!t)return"当前没有可用关键点，请先切换图像或调整参数。";switch(e){case"scale-space":return`当前锁定的关键点位于 (${t.x}, ${t.y})，σ = ${t.scale.toFixed(2)}。它之所以值得继续分析，是因为该局部结构在当前尺度链里仍能保持稳定。`;case"dog-detection":if(s){let e=s.prevComparisons.filter(e=>"greater"===e.relation).length,t=s.sameComparisons.filter(e=>"greater"===e.relation).length,a=s.nextComparisons.filter(e=>"greater"===e.relation).length,r=s.prevComparisons.length+s.sameComparisons.length+s.nextComparisons.length;return`DoG 值 ${s.currentValue.toFixed(4)}，26 邻域 上层${e}/9 同层${t}/8 下层${a}/9 ${e+t+a===r?"全部大于":"全部小于"}邻居，被判定为${s.isExtremum?"候选关键点":"非极值点"}。`}return`当前关键点 DoG 值 ${t.magnitude.toFixed(4)}。26 邻域跨尺度比较需查看具体比较明细表。`;case"orientation":return`当前关键点主方向为 ${(180*t.orientation/Math.PI).toFixed(0)}\xb0。后续描述子都会围绕这个方向对齐，因此旋转后仍有机会匹配上。`;case"descriptor":return"16×16→4×4→8方向→128维，L2归一化。当前关键点已被编码成 SIFT 128 维 / SURF 64 维局部特征（教学简化实现）。";case"matching":if(a.length>0){let e=[...a].sort((e,t)=>e.distance-t.distance),t=e[0]?.distance??0,s=e[e.length-1]?.distance??0,r=e.reduce((e,t)=>e+t.distance,0)/e.length;return`${a.length} 对匹配通过比值检验（d₁\xb2/d₂\xb2 < 0.8，等价于欧氏距离比 < √0.8 ≈ 0.894）。最近距离 ${t.toFixed(3)}，平均 ${r.toFixed(3)}，最远 ${s.toFixed(3)}。`}return"当前教学演示没有通过比值检验的匹配。阈值 0.8（作用于平方欧氏距离）过滤掉了模棱两可的匹配对。可尝试调整参数或切换图像。";default:return"现在可以从概览进入任一步骤，检查这个关键点是如何一路从候选点变成可匹配特征的。"}}(e,eg,ef,eb),ev=w.findIndex(t=>t.key===e),ew=(0,s.useCallback)(e=>{let t=function(e,t){if(0===t.length)return 0;let s=0,a=1/0;for(let r=0;r<t.length;r++){let m=t[r],i=m.x-e.x,l=m.y-e.y,n=i*i+l*l;n<a&&(a=n,s=r)}return s}(e,en),s=en[t];et(s?{x:s.x,y:s.y}:e),Z(t)},[en]),eS=(0,s.useCallback)(e=>{0===el.length||(el[0]?.length??0)<=0||ew((0,y.moveGridPoint)(ee,{width:el[0]?.length??0,height:el.length},e))},[ee,el,ew]),eF=(0,s.useCallback)((e,t)=>{ew({x:e,y:t})},[ew]),eC=(0,s.useCallback)(e=>{b(e),Z(0),et({x:16,y:16})},[]),eD=(0,s.useCallback)(e=>{W(e),Z(0),et({x:16,y:16})},[]),eI=(0,s.useCallback)(e=>{ea(e),em("auto"!==e)},[]),eM=(0,s.useCallback)(()=>{h(w[Math.max(0,ev-1)].key)},[ev]),eT=(0,s.useCallback)(()=>{let e=Math.min(w.length-1,ev+1);h(w[e].key)},[ev]),ek=(0,s.useMemo)(()=>eg?(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsxs)("div",{className:"grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)_minmax(0,0.9fr)]",children:[(0,t.jsxs)("div",{children:[(0,t.jsx)("div",{className:"text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400",children:"当前关键点"}),(0,t.jsxs)("div",{className:"mt-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800",children:["(",eg.x,", ",eg.y,") / octave ",eg.octave," / σ=",eg.scale.toFixed(2),ef&&(0,t.jsxs)("span",{className:"ml-2 text-[10px] text-red-600",children:["DoG=",ef.currentValue.toFixed(4)]})]})]}),(0,t.jsxs)("div",{children:[(0,t.jsx)("div",{className:"text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400",children:"当前证据"}),(0,t.jsx)("div",{className:"mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-slate-700",children:ey})]}),(0,t.jsxs)("div",{children:[(0,t.jsx)("div",{className:"text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400",children:"当前结果"}),(0,t.jsx)("div",{className:"mt-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800",children:eN})]})]}),ej.length>0?(0,t.jsx)("div",{className:"mt-3 flex flex-wrap gap-2 text-xs text-slate-600",children:ej.map(e=>(0,t.jsx)(c.TeachingTerm,{term:e.term,explanation:e.explanation},e.term))}):null]}):null,[eg,ef,ey,eN,ej]),eG=(0,t.jsxs)("div",{className:"space-y-4",children:[(0,t.jsxs)("div",{className:"rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3",children:[(0,t.jsx)("div",{className:"text-xs font-semibold text-amber-800",children:"课堂任务"}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-5 text-amber-800",children:"沿着 6 个步骤观察 SIFT/SURF 关键点如何被检测、定向、描述和匹配。 SURF 是 SIFT 的加速版本，可以在每步切换标签对比差异。"})]}),(0,t.jsx)(V,{activeStage:e,onStageChange:h,stageIndex:ev}),(0,t.jsxs)("div",{className:"grid grid-cols-2 gap-2",children:[(0,t.jsx)("button",{type:"button",onClick:eM,disabled:ev<=0,className:"rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40",children:"上一步"}),(0,t.jsx)("button",{type:"button",onClick:eT,disabled:ev>=w.length-1,className:"rounded-xl border border-amber-200 bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40",children:"下一步"})]}),(0,t.jsx)(d.SelectParam,{label:"测试图像",value:g,onChange:eC,options:S}),(0,t.jsx)(d.SliderParam,{label:"初始尺度 σ",value:_,onChange:eD,min:.5,max:2,step:.1}),(0,t.jsx)(d.SliderParam,{label:"每组层数",value:Y,onChange:e=>{J(e),Z(0)},min:3,max:5,step:1}),(0,t.jsx)("p",{className:"-mt-2 text-[10px] text-slate-500",children:"算法会自动补充额外高斯层，保证 26 邻域跨尺度检测有足够中间层。"}),"matching"===e&&(0,t.jsx)(d.SelectParam,{label:"参考图像",value:es,onChange:eI,options:F}),(0,t.jsxs)("div",{className:"rounded-xl border border-amber-200 bg-amber-50 px-3 py-3",children:[(0,t.jsx)("div",{className:"text-[11px] font-semibold text-amber-800",children:"检测到的关键点"}),(0,t.jsxs)("div",{className:"mt-1 text-[10px] text-amber-700",children:["共 ",en.length," 个（按响应值排序，显示前 10 个）。"]}),(0,t.jsx)("div",{className:"mt-2 grid grid-cols-5 gap-1",children:en.slice(0,10).map((e,s)=>(0,t.jsxs)("button",{type:"button",onClick:()=>{Z(s),et({x:e.x,y:e.y})},className:"min-h-7 rounded px-1.5 py-1 text-[9px] font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 "+(Q===s?"bg-amber-500 text-white":"bg-white text-slate-600 hover:bg-amber-100"),"aria-pressed":Q===s,"aria-label":`选择第 ${s} 个关键点`,children:["#",s]},s))}),eg&&(0,t.jsxs)("div",{className:"mt-2 rounded-lg bg-white/80 px-2 py-1.5 text-[10px] text-slate-700",children:["Kp #",Q,": (",eg.x,",",eg.y,") σ=",eg.scale.toFixed(1),"θ=",(180*eg.orientation/Math.PI).toFixed(0),"°"]})]})]}),eR=(0,s.useMemo)(()=>{if("matching"!==e||"sift"!==u)return[];let t=eh?.stepData.matches??[],s=eh?.referenceKeypoints??[],a=el[0]?.length??1,r=el.length||1,m=ec?.image[0]?.length??a,i=ec?.image.length??r;return t.slice(0,12).map((e,t)=>{let l=en[e.queryIdx],n=s[e.trainIdx];return l&&n?{id:`match-${t}`,tone:"amber",straight:!0,from:{kind:"pixel",selector:".sift-match-query-image",x:l.x,y:l.y,imageWidth:a,imageHeight:r},to:{kind:"pixel",selector:".sift-match-reference-image",x:n.x,y:n.y,imageWidth:m,imageHeight:i}}:null}).filter(Boolean)},[e,u,eh,en,el,ec]),eL=(0,s.useMemo)(()=>{switch(e){case"matching":{let e=eh?.stepData.matches??[];return(0,t.jsxs)("div",{className:"space-y-4",children:[ek,(0,t.jsx)($,{activeTab:u,onChange:p}),"sift"===u&&(0,t.jsxs)("div",{className:"grid gap-4 lg:grid-cols-2",children:[(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)("div",{className:"mb-2 text-[11px] font-semibold text-red-700",children:"待匹配图像"}),(0,t.jsx)(o.ImageCanvas,{image:eu,maxDisplaySize:180,showGrid:!1,containerClassName:"sift-match-query-image"}),(0,t.jsxs)("p",{className:"mt-2 text-xs text-slate-500",children:[en.length," 个关键点"]})]}),(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsxs)("div",{className:"mb-2 text-[11px] font-semibold text-emerald-700",children:["参考图像",ec?`（${ec.label}）`:""]}),ep&&(0,t.jsx)(o.ImageCanvas,{image:ep,maxDisplaySize:180,showGrid:!1,containerClassName:"sift-match-reference-image"}),(0,t.jsxs)("p",{className:"mt-2 text-xs text-slate-500",children:[eh?.referenceKeypoints.length??0," 个关键点"]})]})]}),"surf"===u&&(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)("div",{className:"mb-2 text-[11px] font-semibold text-amber-700",children:"SURF 64D 描述子匹配"}),(0,t.jsx)("p",{className:"text-xs leading-6 text-slate-600",children:"SURF 使用 64 维描述子进行匹配，相比 SIFT 的 128 维减少了一半的存储和计算量。 相同的比值检验策略用于判断匹配可靠性。"}),(0,t.jsxs)("div",{className:"mt-4 grid grid-cols-2 gap-4",children:[(0,t.jsxs)("div",{className:"rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center",children:[(0,t.jsx)("div",{className:"text-2xl font-bold text-amber-700",children:e.length}),(0,t.jsx)("div",{className:"text-xs text-amber-600",children:"匹配对数"})]}),(0,t.jsxs)("div",{className:"rounded-xl border border-slate-200 bg-white px-4 py-3 text-center",children:[(0,t.jsx)("div",{className:"text-sm font-semibold text-slate-700",children:"64 维 / 128 维"}),(0,t.jsx)("div",{className:"text-xs text-slate-500",children:"SURF 描述子更短"})]})]})]}),"compare"===u&&(0,t.jsx)(B,{}),("sift"===u||"surf"===u)&&e.length>0&&(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsxs)("div",{className:"mb-2 text-xs font-semibold text-slate-700",children:["sift"===u?"SIFT":"SURF"," 匹配距离列表（",e.length," 对通过比值检验）"]}),(0,t.jsx)("div",{className:"space-y-1",children:e.slice(0,10).map((e,s)=>(0,t.jsxs)("div",{className:"flex items-center gap-2 rounded bg-slate-50 px-3 py-1.5 text-xs",children:[(0,t.jsxs)("span",{className:"w-6 text-right text-[9px] text-slate-400",children:["#",s+1]}),(0,t.jsxs)("span",{className:"font-mono text-slate-600",children:["Kp ",e.queryIdx," ↔ Kp ",e.trainIdx]}),(0,t.jsx)("div",{className:"h-2.5 flex-1 rounded bg-slate-100",children:(0,t.jsx)("div",{className:"h-full rounded bg-amber-500",style:{width:Math.min(Math.max(100-50*e.distance,5),100)+"%"}})}),(0,t.jsx)("span",{className:"w-12 text-right font-mono text-slate-500",children:e.distance.toFixed(3)})]},s))}),(0,t.jsx)("div",{className:"mt-2 text-[10px] text-slate-500",children:"比值检验阈值 0.8：d₁² / d₂² < 0.8（等价于欧氏距离比 < 0.894）"})]}),("sift"===u||"surf"===u)&&0===e.length&&(0,t.jsx)(x.TeachingCard,{tone:"amber",children:(0,t.jsx)("div",{className:"text-xs text-slate-600",children:"当前没有通过比值检验的匹配，可尝试调整参数或切换图像。"})})]})}case"dog-detection":{let e=ex.neighborComparisons;return(0,t.jsxs)("div",{className:"space-y-4",children:[ek,(0,t.jsx)($,{activeTab:u,onChange:p}),"sift"===u&&(0,t.jsxs)("div",{className:"space-y-4",children:[e?(0,t.jsx)(O,{data:e}):(0,t.jsx)(x.TeachingCard,{tone:"amber",children:(0,t.jsx)("div",{className:"text-xs text-slate-600",children:"当前选中关键点没有跨尺度 26 邻域比较数据。"})}),(0,t.jsx)(l.ProcessRail,{children:(0,t.jsxs)(l.FlowColumns,{children:[(0,t.jsx)(l.FlowColumn,{align:"start",children:(0,t.jsxs)(l.FlowNode,{tone:"red",children:[(0,t.jsx)("div",{className:"mb-2 text-[11px] font-semibold text-red-700",children:"原图（关键点标记）"}),(0,t.jsx)(o.ImageCanvas,{image:eu,maxDisplaySize:130,showGrid:!1}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-5 text-slate-600",children:"跨尺度仍然突出的候选关键点被保留。"})]})}),(0,t.jsx)(l.FlowColumn,{align:"center",children:(0,t.jsxs)(l.FlowNode,{tone:"amber",children:[(0,t.jsx)("div",{className:"mb-2 text-[11px] font-semibold text-amber-700",children:"DoG 响应图"}),ed.length>0&&(0,t.jsx)(o.ImageCanvas,{image:ed[0],maxDisplaySize:130,showGrid:!1}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-5 text-slate-600",children:"DoG 把「局部结构变化最明显」的位置凸显出来。"})]})}),(0,t.jsx)(l.FlowColumn,{align:"end",children:(0,t.jsxs)(l.FlowNode,{tone:"emerald",children:[(0,t.jsx)("div",{className:"mb-2 text-[11px] font-semibold text-emerald-700",children:"选中关键点"}),(0,t.jsx)(o.ImageCanvas,{image:eu,maxDisplaySize:130,showGrid:!1,highlightPixel:{x:ex.currentKeypoint?.x??0,y:ex.currentKeypoint?.y??0}}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-5 text-slate-600",children:"当前高亮点就是后续要继续分配方向、生成描述子的局部结构。"})]})})]})})]}),"surf"===u&&(0,t.jsxs)("div",{className:"space-y-4",children:[(0,t.jsxs)(x.TeachingCard,{tone:"amber",children:[(0,t.jsx)("div",{className:"text-xs font-semibold text-amber-800",children:"教学简化说明"}),(0,t.jsx)("p",{className:"mt-1 text-xs leading-5 text-amber-700",children:"当前页面 SURF 标签为教学示意实现：关键点仍由简化 DoG 流程生成，描述子未使用真实 SURF 的 Haar 小波方向分配与旋转对齐。重点展示 SURF 与 SIFT 在「检测思想 / 描述子结构 / 速度优势」上的区别。"})]}),(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"SURF Hessian 行列式检测"}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-6 text-slate-600",children:"SURF 使用近似的 Hessian 矩阵行列式定位关键点。与 DoG 在相邻高斯层之间做差不同， Hessian 行列式直接在单层响应图上评估二阶变化强度。"})]}),(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsxs)("div",{className:"grid gap-4 md:grid-cols-2",children:[(0,t.jsx)(n.FormulaCard,{label:"Hessian 矩阵",mathML:R,tone:"embedded"}),(0,t.jsx)(n.FormulaCard,{label:"近似行列式",mathML:L,tone:"embedded"})]}),(0,t.jsx)("p",{className:"mt-2 text-xs text-slate-500",children:"w 取 0.9，补偿近似误差。"})]}),(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)(a.default,{src:(0,v.resolveAssetPath)("/assets/sift-surf/surf-hessian-filters.jpg"),alt:"SURF 滤波器",width:387,height:384,loading:"lazy",className:"h-auto max-w-full rounded-lg"}),(0,t.jsx)("div",{className:"mt-1 text-[10px] text-slate-500",children:"盒子滤波器对高斯二阶导数的近似（9x9 模板）。"})]})]}),"compare"===u&&(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"DoG vs Hessian 检测对比"}),(0,t.jsx)("div",{className:"mt-3 w-full overflow-x-auto",children:(0,t.jsxs)("table",{className:"w-full border-collapse text-[11px]",children:[(0,t.jsx)("thead",{children:(0,t.jsxs)("tr",{className:"border-b border-slate-300",children:[(0,t.jsx)("th",{className:"px-3 py-2 text-left font-semibold text-slate-700",children:"特性"}),(0,t.jsx)("th",{className:"px-3 py-2 text-left font-semibold text-slate-700",children:"DoG（SIFT）"}),(0,t.jsx)("th",{className:"px-3 py-2 text-left font-semibold text-slate-700",children:"Hessian（SURF）"})]})}),(0,t.jsxs)("tbody",{children:[(0,t.jsxs)("tr",{className:"border-b border-slate-200",children:[(0,t.jsx)("td",{className:"px-3 py-1.5 font-medium text-slate-600",children:"基本原理"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"相邻高斯层相减"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"二阶偏导矩阵行列式"})]}),(0,t.jsxs)("tr",{className:"border-b border-slate-200",children:[(0,t.jsx)("td",{className:"px-3 py-1.5 font-medium text-slate-600",children:"响应含义"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"跨尺度灰度变化"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"局部二阶结构强度"})]}),(0,t.jsxs)("tr",{className:"border-b border-slate-200",children:[(0,t.jsx)("td",{className:"px-3 py-1.5 font-medium text-slate-600",children:"邻域抑制"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"26 邻域（跨 3 层）"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"3x3x3 非极大抑制"})]}),(0,t.jsxs)("tr",{className:"border-b border-slate-200",children:[(0,t.jsx)("td",{className:"px-3 py-1.5 font-medium text-slate-600",children:"计算速度"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"较慢"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"快（积分图）"})]})]})]})})]})]})}case"scale-space":return(0,t.jsxs)("div",{className:"space-y-4",children:[ek,(0,t.jsx)($,{activeTab:u,onChange:p}),"sift"===u&&(0,t.jsx)(l.ProcessRail,{children:(0,t.jsxs)(l.FlowColumns,{children:[(0,t.jsx)(l.FlowColumn,{align:"start",children:(0,t.jsxs)(l.FlowNode,{tone:"red",children:[(0,t.jsx)("div",{className:"mb-2 text-[11px] font-semibold text-red-700",children:"原图 I(x,y)"}),(0,t.jsx)(o.ImageCanvas,{image:el,maxDisplaySize:120,showGrid:!1})]})}),(0,t.jsx)(l.FlowColumn,{align:"center",children:(0,t.jsxs)(l.FlowNode,{tone:"amber",children:[(0,t.jsx)("div",{className:"mb-2 text-[11px] font-semibold text-amber-700",children:"高斯卷积"}),(0,t.jsx)("div",{className:"rounded bg-amber-50 px-3 py-3 text-center text-xs text-amber-800",children:"G(x,y,σ) * I(x,y)"}),eo.length>1&&(0,t.jsxs)("div",{className:"mt-3",children:[(0,t.jsx)("div",{className:"mb-1 text-[10px] text-amber-700",children:"尺度层"}),(0,t.jsx)("div",{className:"grid grid-cols-4 gap-1",children:eo.slice(0,4).map((e,s)=>(0,t.jsxs)("div",{className:"flex flex-col items-center",children:[(0,t.jsx)(o.ImageCanvas,{image:e,maxDisplaySize:50,showGrid:!1}),(0,t.jsxs)("span",{className:"mt-0.5 text-[8px] text-slate-500",children:["s=",s]})]},s))})]})]})}),(0,t.jsx)(l.FlowColumn,{align:"end",children:(0,t.jsxs)(l.FlowNode,{tone:"emerald",children:[(0,t.jsx)("div",{className:"mb-2 text-[11px] font-semibold text-emerald-700",children:"模糊结果"}),(0,t.jsx)(o.ImageCanvas,{image:eo[1]??el,maxDisplaySize:120,showGrid:!1}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-5 text-slate-600",children:"尺度 σ 越大，图像越模糊。"})]})})]})}),"surf"===u&&(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"SURF 尺度空间：固定尺寸，变化滤波器"}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-6 text-slate-600",children:"SURF 不改变图像大小，而是保持原图尺寸不变，通过增大盒子滤波器（box filter）的模板 来模拟不同尺度的卷积效果。结合积分图，使得任意尺寸的矩形区域卷积都只需常数时间。"})]}),"compare"===u&&(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"尺度空间策略对比"}),(0,t.jsx)("div",{className:"mt-3 w-full overflow-x-auto",children:(0,t.jsxs)("table",{className:"w-full border-collapse text-[11px]",children:[(0,t.jsx)("thead",{children:(0,t.jsxs)("tr",{className:"border-b border-slate-300",children:[(0,t.jsx)("th",{className:"px-3 py-2 text-left font-semibold text-slate-700",children:"维度"}),(0,t.jsx)("th",{className:"px-3 py-2 text-left font-semibold text-slate-700",children:"SIFT"}),(0,t.jsx)("th",{className:"px-3 py-2 text-left font-semibold text-slate-700",children:"SURF"})]})}),(0,t.jsxs)("tbody",{children:[(0,t.jsxs)("tr",{className:"border-b border-slate-200",children:[(0,t.jsx)("td",{className:"px-3 py-1.5 font-medium text-slate-600",children:"图像策略"}),(0,t.jsxs)("td",{className:"px-3 py-1.5 text-slate-700",children:["标准：octave 降采样改变大小",(0,t.jsx)("br",{}),"本页：固定图像尺寸、改变 σ（教学简化）"]}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"固定图像大小"})]}),(0,t.jsxs)("tr",{className:"border-b border-slate-200",children:[(0,t.jsx)("td",{className:"px-3 py-1.5 font-medium text-slate-600",children:"卷积核"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"高斯核（Gaussian kernel）"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"盒子滤波器（Box filter）"})]}),(0,t.jsxs)("tr",{className:"border-b border-slate-200",children:[(0,t.jsx)("td",{className:"px-3 py-1.5 font-medium text-slate-600",children:"加速手段"}),(0,t.jsxs)("td",{className:"px-3 py-1.5 text-slate-700",children:["标准：octave 降采样减少数据量",(0,t.jsx)("br",{}),"本页：同尺寸卷积（教学简化）"]}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"积分图常数时间查表"})]}),(0,t.jsxs)("tr",{className:"border-b border-slate-200",children:[(0,t.jsx)("td",{className:"px-3 py-1.5 font-medium text-slate-600",children:"精度"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"更高（精确高斯）"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"较低（近似）"})]})]})]})})]})]});case"orientation":return(0,t.jsxs)("div",{className:"space-y-4",children:[ek,(0,t.jsx)($,{activeTab:u,onChange:p}),"sift"===u&&(0,t.jsx)(l.ProcessRail,{children:(0,t.jsxs)(l.FlowColumns,{children:[(0,t.jsx)(l.FlowColumn,{align:"start",children:(0,t.jsxs)(l.FlowNode,{tone:"red",children:[(0,t.jsx)("div",{className:"mb-2 text-[11px] font-semibold text-red-700",children:"关键点邻域梯度"}),ex.gradientMagnitudes&&(0,t.jsx)(o.ImageCanvas,{image:ex.gradientMagnitudes,maxDisplaySize:120,showGrid:!1}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-5 text-slate-600",children:"以关键点为中心，计算 17x17 邻域的梯度幅值。"})]})}),(0,t.jsx)(l.FlowColumn,{align:"center",children:(0,t.jsxs)(l.FlowNode,{tone:"sky",children:[(0,t.jsx)("div",{className:"mb-2 text-[11px] font-semibold text-sky-700",children:"方向直方图"}),ex.orientationHistogram?(0,t.jsxs)("div",{children:[(0,t.jsx)("div",{className:"mb-2 text-[10px] text-sky-700",children:"教学简化：8 柱直方图（标准 SIFT 使用 36 柱，每柱 10°）"}),(0,t.jsx)(q,{hist:ex.orientationHistogram,highlightBin:(()=>{let e=ex.orientationHistogram??[],t=0;for(let s=1;s<e.length;s++)e[s]>e[t]&&(t=s);return t})()}),ex.currentKeypoint&&(0,t.jsx)("div",{className:"mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800",children:(0,t.jsx)(c.TeachingTerm,{term:"8 柱直方图",explanation:"标准 SIFT 使用 36 柱（每柱 10°），本教学实现为便于可视化简化为 8 柱（每柱 45°）。"})})]}):(0,t.jsx)("div",{className:"text-xs text-slate-400",children:"无数据"})]})}),(0,t.jsx)(l.FlowColumn,{align:"end",children:(0,t.jsxs)(l.FlowNode,{tone:"emerald",children:[(0,t.jsx)("div",{className:"mb-2 text-[11px] font-semibold text-emerald-700",children:"方向分配结果"}),ex.currentKeypoint&&(0,t.jsxs)("div",{className:"rounded-xl border border-emerald-200 bg-white px-4 py-3 text-center",children:[(0,t.jsxs)("div",{className:"text-lg font-bold text-emerald-700",children:[(180*ex.currentKeypoint.orientation/Math.PI).toFixed(0),"°"]}),(0,t.jsx)("div",{className:"mt-1 text-xs text-slate-500",children:"关键点主方向"})]}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-5 text-slate-600",children:"直方图峰值方向为关键点主方向，使描述子具有旋转不变性。"})]})})]})}),"surf"===u&&(0,t.jsx)(l.ProcessRail,{children:(0,t.jsxs)(l.FlowColumns,{children:[(0,t.jsx)(l.FlowColumn,{align:"start",children:(0,t.jsxs)(l.FlowNode,{tone:"amber",children:[(0,t.jsx)("div",{className:"mb-2 text-[11px] font-semibold text-amber-700",children:"圆形邻域"}),(0,t.jsx)("div",{className:"rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-xs text-amber-800",children:"SURF 在关键点周围圆形邻域内计算 Haar 小波响应"})]})}),(0,t.jsx)(l.FlowColumn,{align:"center",children:(0,t.jsxs)(l.FlowNode,{tone:"sky",children:[(0,t.jsx)("div",{className:"mb-2 text-[11px] font-semibold text-sky-700",children:"扇形滑动窗口"}),(0,t.jsx)("p",{className:"text-xs leading-5 text-slate-600",children:"以一个 π/3 的扇形窗口扫描 360°，窗口内 x 和 y 方向 Haar 小波响应的 矢量累加和最大的方向即为主方向。"})]})}),(0,t.jsx)(l.FlowColumn,{align:"end",children:(0,t.jsxs)(l.FlowNode,{tone:"emerald",children:[(0,t.jsx)("div",{className:"mb-2 text-[11px] font-semibold text-emerald-700",children:"主方向"}),ex.currentKeypoint&&(0,t.jsxs)("div",{className:"rounded-xl border border-emerald-200 bg-white px-4 py-3 text-center",children:[(0,t.jsxs)("div",{className:"text-lg font-bold text-emerald-700",children:[(180*ex.currentKeypoint.orientation/Math.PI).toFixed(0),"°"]}),(0,t.jsx)("div",{className:"mt-1 text-xs text-slate-500",children:"与 SIFT 共享的关键点方向"})]})]})})]})}),"compare"===u&&(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"方向分配对比"}),(0,t.jsx)("div",{className:"mt-3 w-full overflow-x-auto",children:(0,t.jsxs)("table",{className:"w-full border-collapse text-[11px]",children:[(0,t.jsx)("thead",{children:(0,t.jsxs)("tr",{className:"border-b border-slate-300",children:[(0,t.jsx)("th",{className:"px-3 py-2 text-left font-semibold text-slate-700",children:"维度"}),(0,t.jsx)("th",{className:"px-3 py-2 text-left font-semibold text-slate-700",children:"SIFT"}),(0,t.jsx)("th",{className:"px-3 py-2 text-left font-semibold text-slate-700",children:"SURF"})]})}),(0,t.jsxs)("tbody",{children:[(0,t.jsxs)("tr",{className:"border-b border-slate-200",children:[(0,t.jsx)("td",{className:"px-3 py-1.5 font-medium text-slate-600",children:"邻域形状"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"正方形"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"圆形"})]}),(0,t.jsxs)("tr",{className:"border-b border-slate-200",children:[(0,t.jsx)("td",{className:"px-3 py-1.5 font-medium text-slate-600",children:"特征计算"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"梯度幅值和方向"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"Haar 小波响应 dx, dy"})]}),(0,t.jsxs)("tr",{className:"border-b border-slate-200",children:[(0,t.jsx)("td",{className:"px-3 py-1.5 font-medium text-slate-600",children:"统计方式"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"36 柱直方图投票"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"π/3 扇形滑动求和"})]}),(0,t.jsxs)("tr",{className:"border-b border-slate-200",children:[(0,t.jsx)("td",{className:"px-3 py-1.5 font-medium text-slate-600",children:"加速"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"无特殊加速"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"积分图快速 Haar 响应"})]})]})]})})]})]});case"descriptor":return(0,t.jsxs)("div",{className:"space-y-4",children:[ek,(0,t.jsx)($,{activeTab:u,onChange:p}),"sift"===u&&(0,t.jsx)(l.ProcessRail,{children:(0,t.jsxs)(l.FlowColumns,{children:[(0,t.jsx)(l.FlowColumn,{align:"start",children:(0,t.jsxs)(l.FlowNode,{tone:"red",children:[(0,t.jsx)("div",{className:"mb-2 text-[11px] font-semibold text-red-700",children:"关键点邻域"}),ex.gradientMagnitudes&&(0,t.jsx)(o.ImageCanvas,{image:ex.gradientMagnitudes,maxDisplaySize:120,showGrid:!0}),(0,t.jsx)("p",{className:"mt-2 text-xs text-slate-600",children:"16x16 邻域划分为 4x4 子区域。"})]})}),(0,t.jsx)(l.FlowColumn,{align:"center",children:(0,t.jsxs)(l.FlowNode,{tone:"sky",children:[(0,t.jsx)("div",{className:"mb-2 text-[11px] font-semibold text-sky-700",children:"4x4x8 = 128 维"}),ex.siftDescriptorGrid&&(0,t.jsx)(A,{grid:ex.siftDescriptorGrid,label:"每个子区域 8 方向"})]})}),(0,t.jsx)(l.FlowColumn,{align:"end",children:(0,t.jsxs)(l.FlowNode,{tone:"emerald",children:[(0,t.jsx)("div",{className:"mb-2 text-[11px] font-semibold text-emerald-700",children:"L2 归一化"}),(0,t.jsx)(n.FormulaCard,{label:"描述子归一化",mathML:G,tone:"embedded"}),(0,t.jsx)("p",{className:"mt-2 text-xs text-slate-500",children:"消除光照线性变化的影响。"})]})})]})}),"surf"===u&&(0,t.jsx)(l.ProcessRail,{children:(0,t.jsxs)(l.FlowColumns,{children:[(0,t.jsx)(l.FlowColumn,{align:"start",children:(0,t.jsxs)(l.FlowNode,{tone:"amber",children:[(0,t.jsx)("div",{className:"mb-2 text-[11px] font-semibold text-amber-700",children:"20s x 20s 区域"}),ex.gradientMagnitudes&&(0,t.jsx)(o.ImageCanvas,{image:ex.gradientMagnitudes,maxDisplaySize:120,showGrid:!0}),(0,t.jsx)("p",{className:"mt-2 text-xs text-slate-600",children:"SURF 描述子区域为 20s x 20s（s 为尺度）。"})]})}),(0,t.jsx)(l.FlowColumn,{align:"center",children:(0,t.jsxs)(l.FlowNode,{tone:"sky",children:[(0,t.jsx)("div",{className:"mb-2 text-[11px] font-semibold text-sky-700",children:"4x4x4 = 64 维"}),ex.surfDescriptorGrid&&(0,t.jsx)(A,{grid:ex.surfDescriptorGrid,label:"Σdx, Σ|dx|, Σdy, Σ|dy|"})]})}),(0,t.jsx)(l.FlowColumn,{align:"end",children:(0,t.jsxs)(l.FlowNode,{tone:"emerald",children:[(0,t.jsx)("div",{className:"mb-2 text-[11px] font-semibold text-emerald-700",children:"Haar 小波响应"}),(0,t.jsx)(n.FormulaCard,{label:"Haar 小波响应",mathML:z,tone:"embedded"}),(0,t.jsx)("p",{className:"mt-2 text-xs text-slate-500",children:"每个子块只记录 4 个值，维数减半。"})]})})]})}),"compare"===u&&(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"描述子对比"}),(0,t.jsx)("div",{className:"mt-3 w-full overflow-x-auto",children:(0,t.jsxs)("table",{className:"w-full border-collapse text-[11px]",children:[(0,t.jsx)("thead",{children:(0,t.jsxs)("tr",{className:"border-b border-slate-300",children:[(0,t.jsx)("th",{className:"px-3 py-2 text-left font-semibold text-slate-700",children:"维度"}),(0,t.jsx)("th",{className:"px-3 py-2 text-left font-semibold text-slate-700",children:"SIFT"}),(0,t.jsx)("th",{className:"px-3 py-2 text-left font-semibold text-slate-700",children:"SURF"})]})}),(0,t.jsxs)("tbody",{children:[(0,t.jsxs)("tr",{className:"border-b border-slate-200",children:[(0,t.jsx)("td",{className:"px-3 py-1.5 font-medium text-slate-600",children:"邻域大小"}),(0,t.jsx)("td",{className:"px-3 py-1.5 font-mono text-slate-700",children:"16x16"}),(0,t.jsx)("td",{className:"px-3 py-1.5 font-mono text-slate-700",children:"20s x 20s"})]}),(0,t.jsxs)("tr",{className:"border-b border-slate-200",children:[(0,t.jsx)("td",{className:"px-3 py-1.5 font-medium text-slate-600",children:"子区域"}),(0,t.jsx)("td",{className:"px-3 py-1.5 font-mono text-slate-700",children:"4x4"}),(0,t.jsx)("td",{className:"px-3 py-1.5 font-mono text-slate-700",children:"4x4"})]}),(0,t.jsxs)("tr",{className:"border-b border-slate-200",children:[(0,t.jsx)("td",{className:"px-3 py-1.5 font-medium text-slate-600",children:"描述方法"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"8 方向梯度直方图"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"Haar 小波 Σdx, Σ|dx|, Σdy, Σ|dy|"})]}),(0,t.jsxs)("tr",{className:"border-b border-slate-200",children:[(0,t.jsx)("td",{className:"px-3 py-1.5 font-medium text-slate-600",children:"维数"}),(0,t.jsx)("td",{className:"px-3 py-1.5 font-mono text-slate-700",children:"128"}),(0,t.jsx)("td",{className:"px-3 py-1.5 font-mono text-slate-700",children:"64"})]}),(0,t.jsxs)("tr",{className:"border-b border-slate-200",children:[(0,t.jsx)("td",{className:"px-3 py-1.5 font-medium text-slate-600",children:"归一化"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"L2 归一化"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"L2 归一化"})]})]})]})}),(0,t.jsx)("div",{className:"mt-4",children:ex.siftDescriptorGrid&&(0,t.jsx)(A,{grid:ex.siftDescriptorGrid,label:"SIFT 各子区域 8 方向直方图"})}),(0,t.jsx)("div",{className:"mt-3",children:ex.surfDescriptorGrid&&(0,t.jsx)(A,{grid:ex.surfDescriptorGrid,label:"SURF 各子区域 4 维响应"})})]})]});default:return(0,t.jsxs)("div",{className:"space-y-4",children:[ek,(0,t.jsx)($,{activeTab:u,onChange:p}),"sift"===u&&(0,t.jsx)(l.ProcessRail,{children:(0,t.jsxs)(l.FlowColumns,{children:[(0,t.jsx)(l.FlowColumn,{align:"start",children:(0,t.jsxs)(l.FlowNode,{tone:"red",children:[(0,t.jsx)("div",{className:"mb-2 text-[11px] font-semibold text-red-700",children:"待检测图像"}),(0,t.jsx)(o.ImageCanvas,{image:el,maxDisplaySize:110,showGrid:!1})]})}),(0,t.jsx)(l.FlowColumn,{align:"center",children:(0,t.jsxs)(l.FlowNode,{tone:"amber",children:[(0,t.jsx)("div",{className:"mb-2 text-[11px] font-semibold text-amber-700",children:"SIFT 四步流程"}),(0,t.jsxs)("div",{className:"space-y-2",children:[(0,t.jsx)("div",{className:"rounded-lg border border-amber-200 bg-white px-3 py-2 text-[10px] text-slate-700",children:"1. 尺度空间极值检测"}),(0,t.jsx)("div",{className:"rounded-lg border border-amber-200 bg-white px-3 py-2 text-[10px] text-slate-700",children:"2. 关键点定位"}),(0,t.jsx)("div",{className:"rounded-lg border border-amber-200 bg-white px-3 py-2 text-[10px] text-slate-700",children:"3. 方向分配"}),(0,t.jsx)("div",{className:"rounded-lg border border-amber-200 bg-white px-3 py-2 text-[10px] text-slate-700",children:"4. 描述子生成"})]})]})}),(0,t.jsx)(l.FlowColumn,{align:"end",children:(0,t.jsxs)(l.FlowNode,{tone:"emerald",children:[(0,t.jsx)("div",{className:"mb-2 text-[11px] font-semibold text-emerald-700",children:"检测结果"}),(0,t.jsx)(o.ImageCanvas,{image:eu,maxDisplaySize:110,showGrid:!1}),(0,t.jsxs)("p",{className:"mt-2 text-[10px] text-slate-500",children:["共 ",en.length," 个关键点"]})]})})]})}),"surf"===u&&(0,t.jsx)(l.ProcessRail,{children:(0,t.jsxs)(l.FlowColumns,{children:[(0,t.jsx)(l.FlowColumn,{align:"start",children:(0,t.jsxs)(l.FlowNode,{tone:"red",children:[(0,t.jsx)("div",{className:"mb-2 text-[11px] font-semibold text-red-700",children:"SURF 算法"}),(0,t.jsx)("p",{className:"text-xs leading-5 text-slate-600",children:"SURF 在 SIFT 基础上引入积分图、近似 Hessian 矩阵和 Haar 小波响应， 大幅提高计算速度，同时保持较好的鲁棒性。"})]})}),(0,t.jsx)(l.FlowColumn,{align:"center",children:(0,t.jsxs)(l.FlowNode,{tone:"amber",children:[(0,t.jsx)("div",{className:"mb-2 text-[11px] font-semibold text-amber-700",children:"关键创新"}),(0,t.jsxs)("div",{className:"space-y-2",children:[(0,t.jsx)("div",{className:"rounded-lg border border-amber-200 bg-white px-3 py-2 text-[10px] text-slate-700",children:"积分图加速任意尺寸卷积"}),(0,t.jsx)("div",{className:"rounded-lg border border-amber-200 bg-white px-3 py-2 text-[10px] text-slate-700",children:"Hessian 行列式代替 DoG"}),(0,t.jsx)("div",{className:"rounded-lg border border-amber-200 bg-white px-3 py-2 text-[10px] text-slate-700",children:"64 维描述子代替 128 维"})]})]})}),(0,t.jsx)(l.FlowColumn,{align:"end",children:(0,t.jsxs)(l.FlowNode,{tone:"emerald",children:[(0,t.jsx)("div",{className:"mb-2 text-[11px] font-semibold text-emerald-700",children:"检测结果"}),(0,t.jsx)(o.ImageCanvas,{image:eu,maxDisplaySize:110,showGrid:!1}),(0,t.jsxs)("p",{className:"mt-2 text-[10px] text-slate-500",children:["相同图像，与 SIFT 相同的 ",en.length," 个关键点"]})]})})]})}),"compare"===u&&(0,t.jsx)(B,{})]})}},[e,u,ek,eu,el,en,eo,ed,ex,eh,ec,ep]),eP=(0,s.useMemo)(()=>{switch(e){case"matching":return(0,t.jsxs)("div",{className:"space-y-4",children:["sift"===u&&(0,t.jsxs)(t.Fragment,{children:[(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"SIFT 特征匹配"}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-6 text-slate-600",children:"特征匹配通过计算两个 SIFT 128 维描述子的欧氏距离来实现。 距离越近，特征越相似。到这一步，算法已经不再直接看像素， 而是比较描述子向量之间的距离。"})]}),(0,t.jsx)(x.TeachingCard,{children:(0,t.jsx)(n.FormulaCard,{label:"欧氏距离",mathML:K,tone:"embedded"})}),(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"最近邻比值检验"}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-6 text-slate-600",children:"对于待配准图上的特征点，计算它到参考图像上所有特征点的欧氏距离， 得到最小距离 d_min 和次小距离 d_2nd。如果："}),(0,t.jsx)("div",{className:"mt-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center font-mono text-sm font-bold text-amber-800",children:"d_min / d_2nd < 0.8"}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-6 text-slate-600",children:"则该匹配被认为是可靠的。阈值越小，匹配越稳定，但数目越少。"})]}),eb.length>0&&(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsxs)("div",{className:"text-xs font-semibold text-slate-700",children:["当前匹配详情（",eb.length," 对）"]}),(0,t.jsx)("div",{className:"mt-2 space-y-1",children:eb.slice(0,10).map((e,s)=>(0,t.jsxs)("div",{className:"flex items-center gap-2 rounded bg-slate-50 px-3 py-1.5 text-xs text-slate-600",children:[(0,t.jsxs)("span",{className:"font-semibold text-slate-700",children:["#",s+1]}),(0,t.jsxs)("span",{children:["Kp ",e.queryIdx," ↔ Kp ",e.trainIdx]}),(0,t.jsxs)("span",{className:"ml-auto font-mono text-amber-700",children:["d = ",e.distance.toFixed(3)]})]},s))})]})]}),"surf"===u&&(0,t.jsxs)(t.Fragment,{children:[(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"SURF 64D 描述子匹配"}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-6 text-slate-600",children:"SURF 描述子只有 64 维，匹配速度是 SIFT 的两倍左右。 虽然维数减半，但 Haar 小波响应保留了足够的局部纹理信息， 在实际应用中与 SIFT 的匹配召回率差异不大。"})]}),(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"匹配策略对比"}),(0,t.jsxs)("table",{className:"mt-2 w-full border-collapse text-[11px]",children:[(0,t.jsx)("thead",{children:(0,t.jsxs)("tr",{className:"border-b border-slate-300",children:[(0,t.jsx)("th",{className:"px-2 py-1.5 text-left font-semibold text-slate-700",children:"特性"}),(0,t.jsx)("th",{className:"px-2 py-1.5 text-left font-semibold text-slate-700",children:"SIFT"}),(0,t.jsx)("th",{className:"px-2 py-1.5 text-left font-semibold text-slate-700",children:"SURF"})]})}),(0,t.jsxs)("tbody",{children:[(0,t.jsxs)("tr",{className:"border-b border-slate-200",children:[(0,t.jsx)("td",{className:"px-2 py-1.5 text-slate-600",children:"描述子维数"}),(0,t.jsx)("td",{className:"px-2 py-1.5 font-mono text-slate-700",children:"128"}),(0,t.jsx)("td",{className:"px-2 py-1.5 font-mono text-slate-700",children:"64"})]}),(0,t.jsxs)("tr",{className:"border-b border-slate-200",children:[(0,t.jsx)("td",{className:"px-2 py-1.5 text-slate-600",children:"匹配距离"}),(0,t.jsx)("td",{className:"px-2 py-1.5 text-slate-700",colSpan:2,children:"欧氏距离"})]}),(0,t.jsxs)("tr",{className:"border-b border-slate-200",children:[(0,t.jsx)("td",{className:"px-2 py-1.5 text-slate-600",children:"检验策略"}),(0,t.jsx)("td",{className:"px-2 py-1.5 text-slate-700",colSpan:2,children:"最近邻比值检验（d₁/d₂ < 阈值）"})]}),(0,t.jsxs)("tr",{className:"border-b border-slate-200",children:[(0,t.jsx)("td",{className:"px-2 py-1.5 text-slate-600",children:"匹配速度"}),(0,t.jsx)("td",{className:"px-2 py-1.5 text-slate-700",children:"较慢（128 维计算开销大）"}),(0,t.jsx)("td",{className:"px-2 py-1.5 text-slate-700",children:"较快（64 维，快约 2×）"})]})]})]})]})]}),"compare"===u&&(0,t.jsxs)(t.Fragment,{children:[(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"匹配算法对比"}),(0,t.jsx)("div",{className:"mt-3 w-full overflow-x-auto",children:(0,t.jsxs)("table",{className:"w-full border-collapse text-[11px]",children:[(0,t.jsx)("thead",{children:(0,t.jsxs)("tr",{className:"border-b border-slate-300",children:[(0,t.jsx)("th",{className:"px-3 py-2 text-left font-semibold text-slate-700",children:"维度"}),(0,t.jsx)("th",{className:"px-3 py-2 text-left font-semibold text-slate-700",children:"Brute-Force"}),(0,t.jsx)("th",{className:"px-3 py-2 text-left font-semibold text-slate-700",children:"FLANN"})]})}),(0,t.jsxs)("tbody",{children:[(0,t.jsxs)("tr",{className:"border-b border-slate-200",children:[(0,t.jsx)("td",{className:"px-3 py-1.5 font-medium text-slate-600",children:"原理"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"逐个比较，找最小距离"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"基于 KD-Tree / K-Means 树"})]}),(0,t.jsxs)("tr",{className:"border-b border-slate-200",children:[(0,t.jsx)("td",{className:"px-3 py-1.5 font-medium text-slate-600",children:"精度"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"最高（穷举）"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"近似，通常足够"})]}),(0,t.jsxs)("tr",{className:"border-b border-slate-200",children:[(0,t.jsx)("td",{className:"px-3 py-1.5 font-medium text-slate-600",children:"速度"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"慢（O(n²)）"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"快（O(n log n)）"})]}),(0,t.jsxs)("tr",{className:"border-b border-slate-200",children:[(0,t.jsx)("td",{className:"px-3 py-1.5 font-medium text-slate-600",children:"适用"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"小数据集，需要精确匹配"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"大数据集，实时应用"})]})]})]})}),(0,t.jsx)("p",{className:"mt-2 text-[10px] text-slate-500",children:"概念对比，不做交互实现。OpenCV 中两者均通过 cv::BFMatcher 和 cv::FlannBasedMatcher 提供。"})]}),(0,t.jsxs)(x.TeachingCard,{tone:"amber",children:[(0,t.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"延伸：汉明距离与二进制描述子"}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-6 text-slate-600",children:"ORB、BRIEF 等二进制描述子不使用浮点向量，而是用 0/1 比特串表示特征。 匹配时使用汉明距离（不同比特位的数量），计算速度远快于欧氏距离。 汉明距离可以通过 CPU 的 POPCNT 指令在单周期内完成，非常适合移动端和实时场景。"}),(0,t.jsx)("div",{className:"mt-3 rounded-lg border border-amber-200 bg-white px-3 py-2 text-[10px] text-slate-600",children:"二进制描述子的距离计算代价远低于浮点描述子，但区分能力也相对较弱。 实际选型需要在速度和区分力之间权衡。"}),(0,t.jsx)("p",{className:"mt-3 text-[10px] leading-5 text-slate-500",children:"延伸阅读：BRIEF（2010）、ORB（2011）、BRISK（2011）、FREAK（2012）。"})]})]})]});case"scale-space":return(0,t.jsxs)("div",{className:"space-y-4",children:["sift"===u&&(0,t.jsxs)(t.Fragment,{children:[(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"高斯尺度空间"}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-6 text-slate-600",children:"尺度空间的核心思想是：通过高斯卷积核在不同尺度下对图像进行平滑， 模拟人眼或相机在不同距离观察目标的效果。尺度越大，图像越模糊，细节被抑制。"}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-6 text-slate-600",children:"同一个目标在远近变化时，会以不同大小落在图像上， 尺度空间正是为不同大小的局部结构提供对应的观察层。"}),ej.length>0?(0,t.jsx)("div",{className:"mt-3 flex flex-wrap gap-2 text-xs text-slate-600",children:ej.map(e=>(0,t.jsx)(c.TeachingTerm,{term:e.term,explanation:e.explanation},e.term))}):null]}),(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)(n.FormulaCard,{label:"高斯函数",mathML:D,tone:"embedded"}),(0,t.jsx)("p",{className:"mt-2 text-xs text-slate-500",children:"σ 控制平滑程度；σ 越大，图像越模糊。"})]}),(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)(n.FormulaCard,{label:"高斯尺度空间",mathML:C,tone:"embedded"}),(0,t.jsx)("p",{className:"mt-2 text-xs text-slate-500",children:"对原图 I(x,y) 与不同尺度 σ 的高斯核 G 做卷积，得到一组尺度空间图像 L。"})]}),(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)("div",{className:"flex flex-wrap gap-3",children:eo.slice(0,5).map((e,s)=>(0,t.jsxs)("div",{className:"flex flex-col items-center",children:[(0,t.jsx)(o.ImageCanvas,{image:e,maxDisplaySize:80,showGrid:!1}),(0,t.jsxs)("div",{className:"mt-1 text-[9px] text-slate-500",children:["σ = ",(_*2**(s/Math.max(Y,1))).toFixed(2)]})]},s))}),(0,t.jsx)("div",{className:"mt-2 text-[10px] text-slate-500",children:"从左到右：σ 逐渐增大，图像逐渐模糊。相邻层尺度因子比例 k。"})]}),(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)(a.default,{src:(0,v.resolveAssetPath)("/assets/sift-surf/gaussian-pyramid.jpg"),alt:"高斯金字塔",width:620,height:548,loading:"lazy",className:"h-auto max-w-full rounded-lg"}),(0,t.jsx)("div",{className:"mt-2 text-[10px] text-slate-500",children:"高斯金字塔：同一阶相邻两层的尺度因子比例系数为 k；标准 SIFT 下一阶由上一阶中间层降采样获得。本页教学实现保持图像尺寸不变，仅改变 σ。"})]})]}),"surf"===u&&(0,t.jsxs)(t.Fragment,{children:[(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"SURF 积分图像"}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-6 text-slate-600",children:"积分图像中每个点存储其左上方向所有像素的灰度值之和。 任意矩形区域的像素和只需 4 次查表即可计算，与矩形大小无关。 这是 SURF 加速的核心基础。"})]}),(0,t.jsx)(x.TeachingCard,{children:(0,t.jsx)(n.FormulaCard,{label:"积分图像定义",mathML:P,tone:"embedded"})}),(0,t.jsx)(x.TeachingCard,{children:(0,t.jsx)(a.default,{src:(0,v.resolveAssetPath)("/assets/sift-surf/integral-image.jpg"),alt:"积分图像",width:1029,height:320,loading:"lazy",className:"h-auto max-w-full rounded-lg"})}),(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)(a.default,{src:(0,v.resolveAssetPath)("/assets/sift-surf/sift-surf-scale-comparison.jpg"),alt:"SIFT 与 SURF 尺度空间对比",width:1259,height:640,loading:"lazy",className:"h-auto max-w-full rounded-lg"}),(0,t.jsx)("div",{className:"mt-1 text-[10px] text-slate-500",children:"标准 SIFT 通过 octave 降采样改变图像大小；本页为教学演示保持图像尺寸不变、仅改变 σ。SURF 保持图像大小不变、改变滤波器大小。"})]})]}),"compare"===u&&(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"尺度空间全对比"}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-6 text-slate-600",children:"标准 SIFT 通过 octave 降采样构建高斯金字塔，不同 octave 的图像尺寸不同； 本页为教学演示保持图像尺寸不变，仅通过改变 σ 生成多尺度高斯层。 SURF 则保持原图尺寸不变，仅通过增大盒子滤波器模板来模拟更大尺度的卷积。 两者都实现了“从精细到粗糙”的多尺度分析，只是实现路径不同。"})]})]});case"dog-detection":return(0,t.jsxs)("div",{className:"space-y-4",children:["sift"===u&&(0,t.jsxs)(t.Fragment,{children:[(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"DoG 尺度空间与极值检测"}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-6 text-slate-600",children:"DoG（Difference of Gaussian）是尺度归一化高斯拉普拉斯的近似， 通过相邻高斯尺度空间的图像相减得到。"}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-6 text-slate-600",children:"DoG 不是简单重复模糊，而是在衡量某个位置在相邻尺度之间的变化是否足够明显。 只有这种跨尺度都突出的点，才值得拿去做后续方向和描述子。"}),ej.length>0?(0,t.jsx)("div",{className:"mt-3 flex flex-wrap gap-2 text-xs text-slate-600",children:ej.map(e=>(0,t.jsx)(c.TeachingTerm,{term:e.term,explanation:e.explanation},e.term))}):null]}),(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)(n.FormulaCard,{label:"DoG 尺度空间",mathML:I,tone:"embedded"}),(0,t.jsx)("p",{className:"mt-2 text-xs text-slate-500",children:"D(x,y,σ) 为相邻高斯尺度空间之差，k 为相邻尺度的比例因子。"})]}),(0,t.jsx)(x.TeachingCard,{children:(0,t.jsx)("div",{className:"flex flex-wrap gap-3",children:ed.slice(0,4).map((e,s)=>(0,t.jsxs)("div",{className:"flex flex-col items-center",children:[(0,t.jsx)(o.ImageCanvas,{image:e,maxDisplaySize:80,showGrid:!1}),(0,t.jsxs)("div",{className:"mt-1 text-[9px] text-slate-500",children:["DoG ",s]})]},s))})}),(0,t.jsx)(x.TeachingCard,{children:(0,t.jsx)(a.default,{src:(0,v.resolveAssetPath)("/assets/sift-surf/dog-pyramid.jpg"),alt:"DoG 金字塔",width:1464,height:976,loading:"lazy",className:"h-auto max-w-full rounded-lg"})}),(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"26 邻域极值检测"}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-6 text-slate-600",children:"在 DoG 尺度空间中，中间层的每个像素需要与同层相邻的 8 个像素、 上下层各 9 个像素（共 26 个邻域点）进行比较。 若该点的 DoG 值比所有 26 个邻域点都大或都小，则记为候选极值点。"})]}),(0,t.jsx)(x.TeachingCard,{children:(0,t.jsx)(n.FormulaCard,{label:"26 邻域极值判定条件",mathML:U,tone:"embedded"})}),(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)(a.default,{src:(0,v.resolveAssetPath)("/assets/sift-surf/dog-extreme-detection.jpg"),alt:"DOG 极值检测 26 邻域",width:618,height:512,loading:"lazy",className:"h-auto max-w-full rounded-lg"}),(0,t.jsx)("div",{className:"mt-2 text-[10px] text-slate-500",children:"标记叉号的像素与 26 个相邻像素比较，确定局部极值。"})]})]}),"surf"===u&&(0,t.jsxs)(t.Fragment,{children:[(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"Hessian 矩阵检测"}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-6 text-slate-600",children:"SURF 使用近似的 Hessian 矩阵行列式定位关键点。 用盒子滤波器近似高斯二阶偏导，结合积分图实现快速卷积。"})]}),(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsxs)("div",{className:"grid gap-4 md:grid-cols-2",children:[(0,t.jsx)(n.FormulaCard,{label:"Hessian 矩阵",mathML:R,tone:"embedded"}),(0,t.jsx)(n.FormulaCard,{label:"近似行列式",mathML:L,tone:"embedded"})]}),(0,t.jsx)("p",{className:"mt-2 text-xs text-slate-500",children:"w 取 0.9，补偿近似误差。"})]}),(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)(a.default,{src:(0,v.resolveAssetPath)("/assets/sift-surf/surf-hessian-filters.jpg"),alt:"SURF 滤波器",width:387,height:384,loading:"lazy",className:"h-auto max-w-full rounded-lg"}),(0,t.jsx)("div",{className:"mt-1 text-[10px] text-slate-500",children:"盒子滤波器对高斯二阶导数的近似（9x9 模板）。"})]})]}),"compare"===u&&(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"检测阶段总对比"}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-6 text-slate-600",children:"SIFT 的 DoG 检测本质上是「跨尺度的灰度变化」检测器；SURF 的 Hessian 行列式则是 「同尺度的二阶结构强度」检测器。两者目标都是寻找稳定、可重复的关键点，但数学工具不同。"})]})]});case"orientation":return(0,t.jsxs)("div",{className:"space-y-4",children:["sift"===u&&(0,t.jsxs)(t.Fragment,{children:[(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"关键点方向分配"}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-6 text-slate-600",children:"为使描述子具有旋转不变性，需要为每个关键点分配基准方向。 基于关键点邻域像素的梯度方向直方图确定主方向。"}),ej.length>0?(0,t.jsx)("div",{className:"mt-3 flex flex-wrap gap-2 text-xs text-slate-600",children:ej.map(e=>(0,t.jsx)(c.TeachingTerm,{term:e.term,explanation:e.explanation},e.term))}):null]}),(0,t.jsx)(x.TeachingCard,{children:(0,t.jsxs)("div",{className:"grid gap-4 md:grid-cols-2",children:[(0,t.jsx)(n.FormulaCard,{label:"梯度幅值",mathML:M,tone:"embedded"}),(0,t.jsx)(n.FormulaCard,{label:"梯度方向",mathML:T,tone:"embedded"})]})}),(0,t.jsx)(x.TeachingCard,{children:ex.orientationHistogram&&(0,t.jsxs)("div",{children:[(0,t.jsx)("div",{className:"mb-2 text-xs font-semibold text-slate-700",children:"当前关键点方向直方图（8 柱，每柱 45°）"}),(0,t.jsx)(c.TeachingTerm,{term:"8 柱教学简化",explanation:"标准 SIFT 使用 36 柱（每柱 10°），本教学实现为便于可视化简化为 8 柱（每柱 45°）。"}),(0,t.jsx)("div",{className:"mt-2",children:(0,t.jsx)(q,{hist:ex.orientationHistogram,highlightBin:(()=>{let e=ex.orientationHistogram??[],t=0;for(let s=1;s<e.length;s++)e[s]>e[t]&&(t=s);return t})()})}),ex.currentKeypoint&&(0,t.jsxs)("div",{className:"mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800",children:["主方向: ",(180*ex.currentKeypoint.orientation/Math.PI).toFixed(1),"°"]})]})}),(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)(a.default,{src:(0,v.resolveAssetPath)("/assets/sift-surf/orientation-histogram.jpg"),alt:"方向直方图",width:751,height:318,loading:"lazy",className:"h-auto max-w-full rounded-lg"}),(0,t.jsx)("div",{className:"mt-1 text-[10px] text-slate-500",children:"直方图的峰值方向即为关键点主方向。"})]})]}),"surf"===u&&(0,t.jsxs)(t.Fragment,{children:[(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"SURF 方向分配"}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-6 text-slate-600",children:"SURF 在关键点周围的圆形邻域内，使用 Haar 小波在 x 和 y 方向上的响应 来确定主方向。一个 π/3 的扇形滑动窗口扫描 360°， 窗口内所有响应的矢量累加和最大的方向即为主方向。"})]}),(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)(a.default,{src:(0,v.resolveAssetPath)("/assets/sift-surf/surf-descriptor.jpg"),alt:"SURF 描述子",width:1765,height:579,loading:"lazy",className:"h-auto max-w-full rounded-lg"}),(0,t.jsx)("div",{className:"mt-1 text-[10px] text-slate-500",children:"SURF 圆形邻域与扇形滑动窗口。"})]})]}),"compare"===u&&(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"方向分配全对比"}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-6 text-slate-600",children:"SIFT 使用正方形邻域的梯度直方图投票，SURF 使用圆形邻域的 Haar 小波响应累加。 两者都为正交方向（尺度→方向）提供旋转不变性。"})]})]});case"descriptor":return(0,t.jsxs)("div",{className:"space-y-4",children:["sift"===u&&(0,t.jsxs)(t.Fragment,{children:[(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"SIFT 描述子"}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-6 text-slate-600",children:"在关键点周围取 16x16 邻域，划分为 4x4 个子区域。 每个子区域计算 8 个方向的梯度累加值，共 4x4x8 = 128 维向量。"}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-6 text-slate-600",children:"这一步的重点不是死记 128 维，而是理解每一维都在回答一个问题： 某个局部小块里，哪一个方向的边缘更强。把 16 个小块都记录下来，局部纹理就被编码进描述子了。"})]}),(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)(a.default,{src:(0,v.resolveAssetPath)("/assets/sift-surf/sift-descriptor-grid.jpg"),alt:"SIFT 描述子网格",width:1426,height:739,loading:"lazy",className:"h-auto max-w-full rounded-lg"}),(0,t.jsx)("div",{className:"mt-1 text-[10px] text-slate-500",children:"左：关键点 16x16 邻域梯度；右：4x4 子区域 8 方向直方图叠加。"})]}),(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)(a.default,{src:(0,v.resolveAssetPath)("/assets/sift-surf/coordinate-rotation.jpg"),alt:"坐标旋转",width:1484,height:634,loading:"lazy",className:"h-auto max-w-full rounded-lg"}),(0,t.jsx)("div",{className:"mt-1 text-[10px] text-slate-500",children:"将坐标轴旋转到关键点主方向，确保旋转不变性。"})]}),(0,t.jsx)(x.TeachingCard,{children:(0,t.jsxs)("div",{className:"grid gap-4 md:grid-cols-2",children:[(0,t.jsx)(n.FormulaCard,{label:"坐标旋转",mathML:k,tone:"embedded"}),(0,t.jsx)(n.FormulaCard,{label:"描述子归一化",mathML:G,tone:"embedded"})]})})]}),"surf"===u&&(0,t.jsxs)(t.Fragment,{children:[(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"SURF 描述子"}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-6 text-slate-600",children:"SURF 描述子区域为 20s x 20s（s 为尺度），同样划分为 4x4 子块。 每个子块计算 Haar 小波在 x 和 y 方向上的响应，并记录 Σdx, Σ|dx|, Σdy, Σ|dy| 四个值， 共 4x4x4 = 64 维。"})]}),(0,t.jsx)(x.TeachingCard,{children:(0,t.jsx)(n.FormulaCard,{label:"Haar 小波响应",mathML:z,tone:"embedded"})}),(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)(a.default,{src:(0,v.resolveAssetPath)("/assets/sift-surf/surf-descriptor.jpg"),alt:"SURF 描述子",width:1765,height:579,loading:"lazy",className:"h-auto max-w-full rounded-lg"}),(0,t.jsx)("div",{className:"mt-1 text-[10px] text-slate-500",children:"SURF 描述子：20s x 20s 区域划分为 4x4 子块，计算 Haar 小波响应。"})]})]}),"compare"===u&&(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"描述子总对比"}),(0,t.jsx)("div",{className:"mt-3 w-full overflow-x-auto",children:(0,t.jsxs)("table",{className:"w-full border-collapse text-[11px]",children:[(0,t.jsx)("thead",{children:(0,t.jsxs)("tr",{className:"border-b border-slate-300",children:[(0,t.jsx)("th",{className:"px-3 py-2 text-left font-semibold text-slate-700",children:"维度"}),(0,t.jsx)("th",{className:"px-3 py-2 text-left font-semibold text-slate-700",children:"SIFT"}),(0,t.jsx)("th",{className:"px-3 py-2 text-left font-semibold text-slate-700",children:"SURF"})]})}),(0,t.jsxs)("tbody",{children:[(0,t.jsxs)("tr",{className:"border-b border-slate-200",children:[(0,t.jsx)("td",{className:"px-3 py-1.5 font-medium text-slate-600",children:"邻域大小"}),(0,t.jsx)("td",{className:"px-3 py-1.5 font-mono text-slate-700",children:"16x16"}),(0,t.jsx)("td",{className:"px-3 py-1.5 font-mono text-slate-700",children:"20s x 20s"})]}),(0,t.jsxs)("tr",{className:"border-b border-slate-200",children:[(0,t.jsx)("td",{className:"px-3 py-1.5 font-medium text-slate-600",children:"子区域"}),(0,t.jsx)("td",{className:"px-3 py-1.5 font-mono text-slate-700",children:"4x4"}),(0,t.jsx)("td",{className:"px-3 py-1.5 font-mono text-slate-700",children:"4x4"})]}),(0,t.jsxs)("tr",{className:"border-b border-slate-200",children:[(0,t.jsx)("td",{className:"px-3 py-1.5 font-medium text-slate-600",children:"描述方法"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"8 方向梯度直方图"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",children:"Haar 小波 Σdx, Σ|dx|, Σdy, Σ|dy|"})]}),(0,t.jsxs)("tr",{className:"border-b border-slate-200",children:[(0,t.jsx)("td",{className:"px-3 py-1.5 font-medium text-slate-600",children:"维数"}),(0,t.jsx)("td",{className:"px-3 py-1.5 font-mono text-slate-700",children:"128"}),(0,t.jsx)("td",{className:"px-3 py-1.5 font-mono text-slate-700",children:"64"})]}),(0,t.jsxs)("tr",{className:"border-b border-slate-200",children:[(0,t.jsx)("td",{className:"px-3 py-1.5 font-medium text-slate-600",children:"归一化"}),(0,t.jsx)("td",{className:"px-3 py-1.5 text-slate-700",colSpan:2,children:"L2 归一化"})]})]})]})}),ex.siftDescriptorGrid&&(0,t.jsx)("div",{className:"mt-4",children:(0,t.jsx)(A,{grid:ex.siftDescriptorGrid,label:"SIFT 各子区域 8 方向直方图"})}),ex.surfDescriptorGrid&&(0,t.jsx)("div",{className:"mt-3",children:(0,t.jsx)(A,{grid:ex.surfDescriptorGrid,label:"SURF 各子区域 4 维响应"})})]})]});default:return(0,t.jsxs)("div",{className:"space-y-4",children:["sift"===u&&(0,t.jsxs)(t.Fragment,{children:[(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"SIFT 算法概述"}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-6 text-slate-600",children:"SIFT（Scale Invariant Feature Transform）是一种经典的局部特征检测算法。 它将一幅图像映射为局部特征向量集，特征向量具有平移、缩放、旋转不变性， 同时对光照变化、仿射变换也有一定不变性。"}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-6 text-slate-600",children:"总共包括四步：（1）检测尺度空间极值点；（2）精确确定关键点位置和尺度； （3）为关键点分配方向；（4）生成关键点描述子。"})]}),(0,t.jsx)(x.TeachingCard,{children:(0,t.jsx)(n.FormulaCard,{label:"尺度空间链式代入",mathML:H,tone:"embedded"})})]}),"surf"===u&&(0,t.jsxs)(t.Fragment,{children:[(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"SURF 算法简介"}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-6 text-slate-600",children:"SURF（Speeded Up Robust Features）在 SIFT 基础上引入积分图、 近似 Hessian 矩阵和 Haar 小波变换来提高时间效率。"}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-6 text-slate-600",children:"可以把 SURF 理解成对 SIFT 思想的「加速实现」：目标仍然是找到稳定、可匹配的局部结构， 只是把尺度检测和描述子统计做得更快、更短。"})]}),(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"积分图像"}),(0,t.jsx)("p",{className:"mt-2 text-xs leading-6 text-slate-600",children:"积分图像中每个点存储其左上方向所有像素的灰度值之和。 任意矩形区域的像素和只需 4 次查表即可计算，与矩形大小无关。"})]}),(0,t.jsx)(x.TeachingCard,{children:(0,t.jsx)(n.FormulaCard,{label:"积分图像定义",mathML:P,tone:"embedded"})}),(0,t.jsx)(x.TeachingCard,{children:(0,t.jsx)(a.default,{src:(0,v.resolveAssetPath)("/assets/sift-surf/integral-image.jpg"),alt:"积分图像",width:1029,height:320,loading:"lazy",className:"h-auto max-w-full rounded-lg"})})]}),"compare"===u&&(0,t.jsx)(B,{}),en.length>0&&(0,t.jsxs)(x.TeachingCard,{children:[(0,t.jsx)("div",{className:"text-xs font-semibold text-slate-700",children:"当前图像检测结果"}),(0,t.jsxs)("div",{className:"mt-2 grid grid-cols-2 gap-2 text-xs",children:[(0,t.jsxs)("div",{className:"rounded-lg bg-slate-50 px-3 py-2",children:[(0,t.jsx)("div",{className:"text-slate-500",children:"关键点总数"}),(0,t.jsx)("div",{className:"text-lg font-bold text-slate-800",children:en.length})]}),(0,t.jsxs)("div",{className:"rounded-lg bg-slate-50 px-3 py-2",children:[(0,t.jsx)("div",{className:"text-slate-500",children:"当前 σ"}),(0,t.jsx)("div",{className:"text-lg font-bold text-slate-800",children:_.toFixed(1)})]}),(0,t.jsxs)("div",{className:"rounded-lg bg-slate-50 px-3 py-2",children:[(0,t.jsx)("div",{className:"text-slate-500",children:"每组层数"}),(0,t.jsx)("div",{className:"text-lg font-bold text-slate-800",children:Y})]})]})]})]})}},[e,u,eo,ed,_,Y,en,ex,ej,eb]);return(0,t.jsx)(i.ConceptLayout,{title:"SIFT / SURF 尺度特征",subtitle:"Scale Invariant Features - 尺度不变的局部特征检测",operationLabel:"overview"===e?"SIFT 四步流程":"scale-space"===e?"尺度空间构建":"dog-detection"===e?"DoG 极值检测":"orientation"===e?"方向分配":"descriptor"===e?"描述子生成":"特征匹配",parameterIntro:"按 6 个步骤推进，观察 SIFT/SURF 关键点如何被检测、定向、描述和匹配。可在每步切换 SIFT/SURF/对比 标签。",originalImage:el,resultImage:eu,parameters:eG,analysisPreview:eL,stepDetails:eP,currentStep:{x:ee.x,y:ee.y,kernelSize:1},imageHints:{input:"点击原图选择关键点",output:"结果图高亮当前选中的关键点"},showOriginalGrid:!1,originalRegionMarker:"dot",singlePageScroll:!0,navigationHintText:"方向键移动 / 点击图像选择关键点",onInputRegionSelect:eF,onOutputPixelSelect:eF,visualOverlay:eR.length>0?(0,t.jsx)(r.AnchoredOverlay,{paths:eR}):null,codeTab:(0,t.jsx)(m.CodeViewer,{languages:[{name:"TypeScript",code:E}]}),onDirectionMove:eS})}],21306)}]);