(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,43082,e=>{"use strict";var m=e.i(71645);function t(e,m,t){switch(t){case"up":return{x:e.x,y:Math.max(0,e.y-1)};case"down":return{x:e.x,y:Math.min(m.height-1,e.y+1)};case"left":return{x:Math.max(0,e.x-1),y:e.y};case"right":return{x:Math.min(m.width-1,e.x+1),y:e.y}}}e.s(["moveGridPoint",0,t,"useGridNavigation",0,function({current:e,bounds:i,onMove:n,disabled:a=!1}){return(0,m.useCallback)(m=>{a||!e||i.width<=0||i.height<=0||n(t(e,i,m))},[i.height,i.width,e,a,n])}])},9821,e=>{"use strict";var m=e.i(18749);e.s(["ImageCanvas",()=>m.default])},16525,e=>{"use strict";var m=e.i(12392);function t(e,t){let i=e.length,n=e[0]?.length||0,a=(0,m.create2DArray)(i,n,0);for(let m=0;m<i;m++)for(let i=0;i<n;i++)a[m][i]=e[m][i][t];return a}e.s(["generateRgbImage",0,function(e){let t=e.length,i=e[0]?.length||0,n=[];for(let a=0;a<t;a++){let s=[];for(let n=0;n<i;n++){let r=e[a][n],l=i>1?n/(i-1):0,o=t>1?a/(t-1):0,d=(0,m.clamp)(.58*r+.36*l+.12*Math.sin(.22*a),0,1),x=(0,m.clamp)(.52*r+(1-o)*.38+.1*Math.cos(.18*n),0,1),c=(0,m.clamp)(.48*r+(1-l)*.22+.32*o+.1*Math.sin((n+a)*.16),0,1);s.push([d,x,c])}n.push(s)}return n},"getDisplayImage",0,function(e,m,i,n){if(!e)return null;switch(m){case"color":default:return null;case"red":return t(e,0);case"green":return t(e,1);case"blue":return t(e,2);case"grayWeighted":return i;case"grayAverage":return n}},"grayscaleSteps",0,function*(e,t){if(!e||0===e.length||!e[0])return;let i=e.length,n=e[0].length;for(let a=0;a<i;a++)for(let i=0;i<n;i++){let[n,s,r]=e[a][i],l=.299*n+.587*s+.114*r,o=(n+s+r)/3,d="weighted"===t?l:o;yield{x:i,y:a,r:n,g:s,b:r,weightedGray:(0,m.clamp)(l,0,1),averageGray:(0,m.clamp)(o,0,1),method:t,outputValue:(0,m.clamp)(d,0,1)}}},"rgbToGrayscaleAverage",0,function(e){let t=e.length,i=e[0]?.length||0,n=(0,m.create2DArray)(t,i,0);for(let m=0;m<t;m++)for(let t=0;t<i;t++){let[i,a,s]=e[m][t];n[m][t]=(i+a+s)/3}return n},"rgbToGrayscaleWeighted",0,function(e){let t=e.length,i=e[0]?.length||0,n=(0,m.create2DArray)(t,i,0);for(let m=0;m<t;m++)for(let t=0;t<i;t++){let[i,a,s]=e[m][t];n[m][t]=.299*i+.587*a+.114*s}return n}])},16952,e=>{"use strict";var m=e.i(43476),t=e.i(71645);e.i(33999);var i=e.i(83032),n=e.i(13870),a=e.i(75345),s=e.i(54712),r=e.i(85255),l=e.i(9821),o=e.i(27981),d=e.i(96891),x=e.i(55052),c=e.i(43082),u=e.i(12392);let h={translateX:0,translateY:0,rotationDeg:18,scaleX:1,scaleY:1,shearX:.2,shearY:0,flipMode:"none"},g=["flip","scale","shear","rotate","translate"];function b(){return[[1,0,0],[0,1,0],[0,0,1]]}function p(e,m){let t=b();for(let i=0;i<3;i++)for(let n=0;n<3;n++)t[i][n]=e[i][0]*m[0][n]+e[i][1]*m[1][n]+e[i][2]*m[2][n];return t}function f(e,m){return{x:m[0][0]*e.x+m[0][1]*e.y+m[0][2],y:m[1][0]*e.x+m[1][1]*e.y+m[1][2]}}function y(e){let m,t,i;return p([[1,0,e.translateX],[0,1,e.translateY],[0,0,1]],p((t=Math.cos(m=e.rotationDeg*Math.PI/180),[[t,-(i=Math.sin(m)),0],[i,t,0],[0,0,1]]),p([[1,e.shearX,0],[e.shearY,1,0],[0,0,1]],p([[e.scaleX,0,0],[0,e.scaleY,0],[0,0,1]],function(e){switch(e){case"horizontal":return[[-1,0,0],[0,1,0],[0,0,1]];case"vertical":return[[1,0,0],[0,-1,0],[0,0,1]];case"both":return[[-1,0,0],[0,-1,0],[0,0,1]];default:return b()}}(e.flipMode)))))}function j(e,m,t){return{x:e.x-(m-1)/2,y:(t-1)/2-e.y}}function v(e,m,t){return{x:e.x+(m-1)/2,y:(t-1)/2-e.y}}function M(e,m,t){return e.x>=0&&e.x<=m-1&&e.y>=0&&e.y<=t-1}function N(e,m,t){let i=e.length,n=e[0]?.length??0;return m<0||m>=n||t<0||t>=i?0:e[t][m]}function w(e,m,t){let i=e.length,n=e[0]?.length??0;if(m<0||m>=n||t<0||t>=i)return[0,0,0];let a=e[t][m];return[a[0]??0,a[1]??0,a[2]??0]}function C(e){let m=(e-1)/2,t=(e-1)/2,i=(m,t)=>({x:(0,u.clamp)(Math.round(m),0,e-1),y:(0,u.clamp)(Math.round(t),0,e-1)});return[{id:"top-bar",label:"A",description:"上方纹理区域的参考点",point:i(m+1,t-3)},{id:"mid-bar",label:"B",description:"图像中心附近的参考点",point:i(m,t)},{id:"bright-dot",label:"C",description:"右下区域的参考点",point:i(m+3,t+3)},{id:"bottom-stem",label:"D",description:"下方边缘附近的参考点",point:i(m-4,t+4)}]}function I(e,m,t,i){let n=j(e,t,i),a=f(n,m),s=v(a,t,i),r={x:Math.round(s.x),y:Math.round(s.y)};return{sourceImage:e,sourceCartesian:n,transformedCartesian:a,destinationImage:s,roundedDestinationImage:r,inBounds:M(s,t,i)}}function $(e,m,t,i,n){let a,s,r,l,o,d,x,c,h,g,b,p,y,w,C,I,$,L,S,T,P,k=e.length,X=e[0]?.length??0,Y=j({x:t,y:i},X,k),F=f(Y,m),A=v(F,X,k),D="nearest"===n?(a=e.length,s=e[0]?.length??0,r=Math.round(A.x),o=N(e,r,l=Math.round(A.y)),{value:o,regionX:(d={x:(0,u.clamp)(Math.round(A.x),0,s-1),y:(0,u.clamp)(Math.round(A.y),0,a-1),width:1,height:1}).x,regionY:d.y,regionWidth:d.width,regionHeight:d.height,nearestSource:{x:r,y:l,value:o},bilinearNeighbors:[]}):(x=e.length,c=e[0]?.length??0,h=Math.floor(A.x),g=Math.floor(A.y),b=h+1,p=g+1,y=A.x-h,w=A.y-g,I=(C=[{label:"Q11",x:h,y:g,value:N(e,h,g),weight:(1-y)*(1-w)},{label:"Q21",x:b,y:g,value:N(e,b,g),weight:y*(1-w)},{label:"Q12",x:h,y:p,value:N(e,h,p),weight:(1-y)*w},{label:"Q22",x:b,y:p,value:N(e,b,p),weight:y*w}]).reduce((e,m)=>e+m.value*m.weight,0),$=(0,u.clamp)(Math.floor(A.x),0,Math.max(0,c-1)),L=(0,u.clamp)(Math.floor(A.y),0,Math.max(0,x-1)),S=Math.min(2,c-$),T=Math.min(2,x-L),{value:I,regionX:(P={x:$,y:L,width:Math.max(1,S),height:Math.max(1,T)}).x,regionY:P.y,regionWidth:P.width,regionHeight:P.height,nearestSource:null,bilinearNeighbors:C});return{x:t,y:i,destinationCartesian:Y,sourceCartesian:F,sourceImage:A,outputValue:D.value,sourceInsideBounds:M(A,X,k),regionX:D.regionX,regionY:D.regionY,regionWidth:D.regionWidth,regionHeight:D.regionHeight,nearestSource:D.nearestSource,bilinearNeighbors:D.bilinearNeighbors}}function L(e,m,t){let i=e.length,n=e[0]?.length??0,a=(0,u.create2DArray)(i,n,0);for(let s=0;s<i;s++)for(let i=0;i<n;i++)a[s][i]=$(e,m,i,s,t).outputValue;return a}function S(e,m,t){let i=e.length,n=e[0]?.length??0,a=Array.from({length:i},()=>Array.from({length:n},()=>[0,0,0]));for(let s=0;s<i;s++)for(let r=0;r<n;r++){let l=v(f(j({x:r,y:s},n,i),m),n,i);a[s][r]=function(e,m,t){let i,n,a,s,r,l,o;return"nearest"===t?w(e,Math.round(m.x),Math.round(m.y)):(i=Math.floor(m.x),n=Math.floor(m.y),a=i+1,s=n+1,r=m.x-i,l=m.y-n,o=[{value:w(e,i,n),weight:(1-r)*(1-l)},{value:w(e,a,n),weight:r*(1-l)},{value:w(e,i,s),weight:(1-r)*l},{value:w(e,a,s),weight:r*l}],[0,1,2].map(e=>(0,u.clamp)(o.reduce((m,t)=>m+t.value[e]*t.weight,0),0,1)))}(e,l,t)}return a}function T(e,m,t){return{x:(0,u.clamp)(e.x,0,m-1),y:(0,u.clamp)(e.y,0,t-1)}}var P=e.i(16525);let k=`function warpAffine(
  image: number[][],
  inverseMatrix: number[][],
  interpolation: 'nearest' | 'bilinear'
): number[][] {
  const height = image.length;
  const width = image[0].length;
  const output = Array.from({ length: height }, () => Array(width).fill(0));

  for (let yPrime = 0; yPrime < height; yPrime++) {
    for (let xPrime = 0; xPrime < width; xPrime++) {
      const [x, y] = applyInverseMapping(xPrime, yPrime, inverseMatrix);
      output[yPrime][xPrime] =
        interpolation === 'nearest'
          ? sampleNearest(image, x, y)
          : sampleBilinear(image, x, y);
    }
  }

  return output;
}`,X=function(e=15){let m=(0,u.create2DArray)(e,e,.08);for(let t=0;t<e;t++)for(let i=0;i<e;i++){let n=j({x:i,y:t},e,e),a=.08+(n.x+7)/14*.04;n.x>=-5&&n.x<=-3&&n.y>=-4&&n.y<=4&&(a=.92),n.x>=-5&&n.x<=1&&n.y>=2&&n.y<=4&&(a=.78),n.x>=-5&&n.x<=0&&n.y>=-1&&n.y<=1&&(a=.62),n.x>=2&&n.x<=5&&n.y>=-5&&n.y<=-2&&(a=.28+(n.x-2)*.12+(n.y+5)*.05),Math.abs(n.x-3)+Math.abs(n.y+3)<=1&&(a=1),m[t][i]=(0,u.clamp)(a,0,1)}return m}(96),Y=C(96)[0].point,F=T(I(Y,y(h),96,96).roundedDestinationImage,96,96),A=(0,r.buildInlineMathML)(`
  <mrow>
    <mi>I</mi><mo>&#x2032;</mo>
    <mo>(</mo><mi>x</mi><mo>&#x2032;</mo><mo>,</mo><mi>y</mi><mo>&#x2032;</mo><mo>)</mo>
    <mo>=</mo>
    <mi>I</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo>
  </mrow>
`),D=(0,r.buildInlineMathML)(`
  <mrow>
    <mfenced open="[" close="]">
      <mtable>
        <mtr><mtd><mi>x</mi><mo>&#x2032;</mo></mtd></mtr>
        <mtr><mtd><mi>y</mi><mo>&#x2032;</mo></mtd></mtr>
        <mtr><mtd><mn>1</mn></mtd></mtr>
      </mtable>
    </mfenced>
    <mo>=</mo>
    <mfenced open="[" close="]">
      <mtable>
        <mtr><mtd><msub><mi>a</mi><mn>11</mn></msub></mtd><mtd><msub><mi>a</mi><mn>12</mn></msub></mtd><mtd><msub><mi>t</mi><mi>x</mi></msub></mtd></mtr>
        <mtr><mtd><msub><mi>a</mi><mn>21</mn></msub></mtd><mtd><msub><mi>a</mi><mn>22</mn></msub></mtd><mtd><msub><mi>t</mi><mi>y</mi></msub></mtd></mtr>
        <mtr><mtd><mn>0</mn></mtd><mtd><mn>0</mn></mtd><mtd><mn>1</mn></mtd></mtr>
      </mtable>
    </mfenced>
    <mfenced open="[" close="]">
      <mtable>
        <mtr><mtd><mi>x</mi></mtd></mtr>
        <mtr><mtd><mi>y</mi></mtd></mtr>
        <mtr><mtd><mn>1</mn></mtd></mtr>
      </mtable>
    </mfenced>
  </mrow>
`),B=(0,r.buildInlineMathML)(`
  <mrow>
    <mi>T</mi><mo>(</mo><msub><mi>t</mi><mi>x</mi></msub><mo>,</mo><msub><mi>t</mi><mi>y</mi></msub><mo>)</mo>
    <mo>=</mo>
    <mfenced open="[" close="]">
      <mtable>
        <mtr><mtd><mn>1</mn></mtd><mtd><mn>0</mn></mtd><mtd><msub><mi>t</mi><mi>x</mi></msub></mtd></mtr>
        <mtr><mtd><mn>0</mn></mtd><mtd><mn>1</mn></mtd><mtd><msub><mi>t</mi><mi>y</mi></msub></mtd></mtr>
        <mtr><mtd><mn>0</mn></mtd><mtd><mn>0</mn></mtd><mtd><mn>1</mn></mtd></mtr>
      </mtable>
    </mfenced>
  </mrow>
`),H=(0,r.buildInlineMathML)(`
  <mrow>
    <mi>S</mi><mo>(</mo><msub><mi>s</mi><mi>x</mi></msub><mo>,</mo><msub><mi>s</mi><mi>y</mi></msub><mo>)</mo>
    <mo>=</mo>
    <mfenced open="[" close="]">
      <mtable>
        <mtr><mtd><msub><mi>s</mi><mi>x</mi></msub></mtd><mtd><mn>0</mn></mtd><mtd><mn>0</mn></mtd></mtr>
        <mtr><mtd><mn>0</mn></mtd><mtd><msub><mi>s</mi><mi>y</mi></msub></mtd><mtd><mn>0</mn></mtd></mtr>
        <mtr><mtd><mn>0</mn></mtd><mtd><mn>0</mn></mtd><mtd><mn>1</mn></mtd></mtr>
      </mtable>
    </mfenced>
  </mrow>
`),W=(0,r.buildInlineMathML)(`
  <mrow>
    <mi>R</mi><mo>(</mo><mi>&#x03B8;</mi><mo>)</mo>
    <mo>=</mo>
    <mfenced open="[" close="]">
      <mtable>
        <mtr><mtd><mi>cos</mi><mi>&#x03B8;</mi></mtd><mtd><mo>-</mo><mi>sin</mi><mi>&#x03B8;</mi></mtd><mtd><mn>0</mn></mtd></mtr>
        <mtr><mtd><mi>sin</mi><mi>&#x03B8;</mi></mtd><mtd><mi>cos</mi><mi>&#x03B8;</mi></mtd><mtd><mn>0</mn></mtd></mtr>
        <mtr><mtd><mn>0</mn></mtd><mtd><mn>0</mn></mtd><mtd><mn>1</mn></mtd></mtr>
      </mtable>
    </mfenced>
  </mrow>
`),R=(0,r.buildInlineMathML)(`
  <mrow>
    <mi>H</mi><mo>(</mo><mi>&#x03B1;</mi><mo>,</mo><mi>&#x03B2;</mi><mo>)</mo>
    <mo>=</mo>
    <mfenced open="[" close="]">
      <mtable>
        <mtr><mtd><mn>1</mn></mtd><mtd><mi>&#x03B1;</mi></mtd><mtd><mn>0</mn></mtd></mtr>
        <mtr><mtd><mi>&#x03B2;</mi></mtd><mtd><mn>1</mn></mtd><mtd><mn>0</mn></mtd></mtr>
        <mtr><mtd><mn>0</mn></mtd><mtd><mn>0</mn></mtd><mtd><mn>1</mn></mtd></mtr>
      </mtable>
    </mfenced>
  </mrow>
`),G=(0,r.buildInlineMathML)(`
  <mrow>
    <mi>正交</mi>
    <mo>&#x2282;</mo>
    <mi>刚体</mi>
    <mo>&#x2282;</mo>
    <mi>相似</mi>
    <mo>&#x2282;</mo>
    <mi>仿射</mi>
  </mrow>
`),z=(0,r.buildInlineMathML)(`
  <mrow>
    <mi>R</mi><msup><mi>R</mi><mi>T</mi></msup><mo>=</mo><mi>I</mi>
  </mrow>
`),O=(0,r.buildInlineMathML)(`
  <mrow>
    <msub><mi>M</mi><mi>rigid</mi></msub>
    <mo>=</mo>
    <mfenced open="[" close="]">
      <mtable>
        <mtr><mtd><mi>R</mi></mtd><mtd><mi>t</mi></mtd></mtr>
        <mtr><mtd><msup><mi>0</mi><mi>T</mi></msup></mtd><mtd><mn>1</mn></mtd></mtr>
      </mtable>
    </mfenced>
  </mrow>
`),V=(0,r.buildInlineMathML)(`
  <mrow>
    <mi>R</mi><msup><mi>R</mi><mi>T</mi></msup><mo>=</mo><mi>k</mi><mi>I</mi>
  </mrow>
`),Q=(0,r.buildInlineMathML)(`
  <mrow>
    <msub><mi>M</mi><mi>affine</mi></msub>
    <mo>=</mo>
    <mfenced open="[" close="]">
      <mtable>
        <mtr><mtd><mi>A</mi></mtd><mtd><mi>t</mi></mtd></mtr>
        <mtr><mtd><msup><mi>0</mi><mi>T</mi></msup></mtd><mtd><mn>1</mn></mtd></mtr>
      </mtable>
    </mfenced>
  </mrow>
`),K={orthogonal:"正交变换",rigid:"刚体变换",similar:"相似变换",affine:"仿射变换"},U={nearest:"最近邻",bilinear:"双线性"};function E(e,m=2){let t=Number(e.toFixed(m));return 1e-9>Math.abs(t)?"0":t.toString()}function q(e){let m=e.map(e=>`<mtr>${e.map(e=>`<mtd><mn>${E(e)}</mn></mtd>`).join("")}</mtr>`).join("");return`<mfenced open="[" close="]"><mtable columnalign="center">${m}</mtable></mfenced>`}function J(e){let m=e.map(e=>`<mtr><mtd><mn>${E(e)}</mn></mtd></mtr>`).join("");return`<mfenced open="[" close="]"><mtable columnalign="center">${m}</mtable></mfenced>`}function Z(e,m){return(0,r.buildInlineMathML)(`
    <mrow>
      ${e}
      <mo>=</mo>
      <mfenced open="[" close="]">
        <mtable columnalign="center">
          <mtr><mtd><msub><mi>m</mi><mn>11</mn></msub></mtd><mtd><msub><mi>m</mi><mn>12</mn></msub></mtd><mtd><msub><mi>m</mi><mn>13</mn></msub></mtd></mtr>
          <mtr><mtd><msub><mi>m</mi><mn>21</mn></msub></mtd><mtd><msub><mi>m</mi><mn>22</mn></msub></mtd><mtd><msub><mi>m</mi><mn>23</mn></msub></mtd></mtr>
          <mtr><mtd><msub><mi>m</mi><mn>31</mn></msub></mtd><mtd><msub><mi>m</mi><mn>32</mn></msub></mtd><mtd><msub><mi>m</mi><mn>33</mn></msub></mtd></mtr>
        </mtable>
      </mfenced>
      <mo>=</mo>
      ${q(m)}
    </mrow>
  `)}e.s(["default",0,function(){var e,p,f,j;let v,[M,N]=(0,t.useState)(h),[w,_]=(0,t.useState)("bilinear"),[ee,em]=(0,t.useState)(Y),[et,ei]=(0,t.useState)(F),[en,ea]=(0,t.useState)(null),[es,er]=(0,t.useState)(X);(0,t.useEffect)(()=>{let e=!1;return(async()=>{try{let m=await (0,u.loadImageAsRgb)("/assets/lena-original.jpg");if(e)return;let t=(0,u.resizeRgbImage)((0,u.centerCropRgbImage)(m),96);ea(t),er((0,P.rgbToGrayscaleWeighted)(t));let i=C(t.length)[0].point,n=t[0]?.length??96,a=t.length,s=y(h);em(i),ei(T(I(i,s,n,a).roundedDestinationImage,n,a))}catch{}})(),()=>{e=!0}},[]);let el=es[0]?.length??0,eo=es.length,ed=(0,t.useMemo)(()=>C(eo),[eo]),ex=(0,t.useMemo)(()=>y(M),[M]),ec=(0,t.useMemo)(()=>(function(e){let m=e[0][0],t=e[0][1],i=e[0][2],n=e[1][0],a=e[1][1],s=e[1][2],r=m*a-t*n;if(1e-6>Math.abs(r))return b();let l=1/r;return[[a*l,-t*l,(t*s-a*i)*l],[-n*l,m*l,(n*i-m*s)*l],[0,0,1]]})(ex),[ex]),eu=(0,t.useMemo)(()=>{let e,m,t,i;return e=Math.abs(M.translateX)>1e-6||Math.abs(M.translateY)>1e-6,m=Math.abs(M.shearX)>1e-6||Math.abs(M.shearY)>1e-6,t=1e-6>=Math.abs(M.scaleX-M.scaleY),i=1e-6>=Math.abs(M.scaleX-1)&&1e-6>=Math.abs(M.scaleY-1),e||m||!i?!m&&i?"rigid":!m&&t?"similar":"affine":"orthogonal"},[M]),eh=(0,t.useMemo)(()=>L(es,ec,"nearest"),[ec,es]),eg=(0,t.useMemo)(()=>L(es,ec,"bilinear"),[ec,es]),eb="nearest"===w?eh:eg,ep=(0,t.useMemo)(()=>en?S(en,ec,"nearest"):null,[ec,en]),ef=(0,t.useMemo)(()=>en?S(en,ec,"bilinear"):null,[ec,en]),ey="nearest"===w?ep:ef,ej=(0,t.useMemo)(()=>$(es,ec,et.x,et.y,w),[et.x,et.y,w,ec,es]),ev=(0,t.useMemo)(()=>$(es,ec,et.x,et.y,"nearest"),[et.x,et.y,ec,es]),eM=(0,t.useMemo)(()=>$(es,ec,et.x,et.y,"bilinear"),[et.x,et.y,ec,es]),eN="nearest"===w?ev:eM,ew=(0,t.useMemo)(()=>I(ee,ex,el,eo),[eo,ex,ee,el]),eC=(0,t.useMemo)(()=>ed.find(e=>e.point.x===ee.x&&e.point.y===ee.y)??null,[ed,ee]),eI=(0,t.useMemo)(()=>{var e,m,t;return e=ej.regionX,m=ej.regionY,t=ej.regionWidth,Array.from({length:ej.regionHeight},(i,n)=>Array.from({length:t},(t,i)=>es[m+n]?.[e+i]??0))},[ej.regionHeight,ej.regionWidth,ej.regionX,ej.regionY,es]),e$=et.y*el+et.x,eL=el*eo,eS=(0,c.useGridNavigation)({current:et,bounds:{width:el,height:eo},onMove:ei,disabled:0===eL}),eT=(0,t.useCallback)((e,m)=>{N(t=>({...t,[e]:m}))},[]),eP=(0,t.useCallback)((e,m)=>{let t={x:e,y:m},i=I(t,ex,el,eo);em(t),ei(T(i.roundedDestinationImage,el,eo))},[eo,ex,el]),ek=(0,t.useCallback)((e,m)=>{let t=$(es,ec,e,m,w);ei({x:e,y:m}),em(T({x:Math.round(t.sourceImage.x),y:Math.round(t.sourceImage.y)},el,eo))},[eo,w,ec,es,el]),eX=(0,m.jsxs)("div",{className:"grid gap-4 lg:grid-cols-[1.3fr,0.9fr]",children:[(0,m.jsxs)("div",{children:[(0,m.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"变换层级"}),(0,m.jsx)("div",{className:"mt-2",children:(0,m.jsx)(r.MathText,{mathML:G,className:"text-sm text-slate-700"})}),(0,m.jsxs)("p",{className:"mt-2 text-xs leading-6 text-slate-500",children:["当前参数对应",(0,m.jsx)("span",{className:"mx-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-medium text-amber-700",children:K[eu]}),"。该层级由是否包含平移、是否保持等比例缩放，以及是否出现剪切共同决定。"]})]}),(0,m.jsxs)("div",{className:"rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3",children:[(0,m.jsx)("div",{className:"text-xs font-semibold uppercase tracking-[0.12em] text-slate-500",children:"坐标约定"}),(0,m.jsx)("p",{className:"mt-2 text-xs leading-6 text-slate-600",children:"为了让旋转方向与角度定义保持一致，程序在画布中心建立笛卡尔坐标系， 再把结果映射回图像像素坐标。"}),(0,m.jsxs)("p",{className:"mt-2 text-xs leading-6 text-slate-600",children:["组合顺序固定为 ",g.join(" → "),"。"]})]})]}),eY=(0,m.jsx)(s.ProcessRail,{children:(0,m.jsxs)(s.FlowColumns,{children:[(0,m.jsx)(s.FlowColumn,{align:"start",children:(0,m.jsxs)(s.FlowNode,{tone:"red",className:"geo-anchor-source-node",children:[(0,m.jsxs)("div",{className:"mb-2 flex items-center justify-between gap-3",children:[(0,m.jsx)("span",{className:"text-[11px] font-semibold uppercase text-red-700",children:"原图采样邻域"}),(0,m.jsx)("span",{className:"text-[11px] text-red-700",children:ej.sourceInsideBounds?`${ej.regionWidth}\xd7${ej.regionHeight}`:"落在图像外"})]}),ej.sourceInsideBounds?(0,m.jsxs)("div",{className:"flex flex-col items-center gap-2",children:[(0,m.jsx)(l.ImageCanvas,{image:eI,maxDisplaySize:120,showGrid:!0,containerClassName:"geo-anchor-source-zoom"}),(0,m.jsx)("div",{className:"max-w-[12rem] text-center text-xs leading-5 text-red-700",children:"反向映射先找到原图中的采样位置，再根据插值方式决定取单点还是取 2×2 邻域。"})]}):(0,m.jsx)("div",{className:"border-t border-red-100 pt-3 text-xs leading-6 text-red-700",children:"当前输出像素反向映射到原图之外，按背景值 0 填充，这也是几何变换中常见的边界处理方式。"}),(0,m.jsxs)("div",{className:"mt-3 border-t border-slate-200 pt-3 text-xs leading-6 text-slate-600",children:["原图坐标约为 (",E(ej.sourceImage.x),", ",E(ej.sourceImage.y),")， 对应中心坐标为 (",E(ej.sourceCartesian.x),", ",E(ej.sourceCartesian.y),")。"]})]})}),(0,m.jsxs)(s.FlowColumn,{align:"center",children:[(0,m.jsxs)(s.FlowNode,{tone:"amber",className:"geo-anchor-matrix-node",children:[(0,m.jsxs)("div",{className:"mb-2 flex items-center justify-between gap-3",children:[(0,m.jsx)("span",{className:"text-[11px] font-semibold uppercase text-amber-800",children:"齐次矩阵"}),(0,m.jsx)("span",{className:"rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[11px] font-medium text-amber-700",children:K[eu]})]}),(0,m.jsx)(r.FormulaCard,{mathML:Z("<mi>M</mi>",ex),formulaClassName:"rounded-xl px-4 py-4 shadow-none",className:"mt-2",note:"矩阵把平移、缩放、旋转、翻转和剪切统一写成一次乘法。"})]}),(0,m.jsxs)(s.FlowNode,{tone:"sky",children:[(0,m.jsx)("div",{className:"mb-2 text-[11px] font-semibold uppercase text-sky-700",children:"教学点正向映射"}),(0,m.jsxs)("div",{className:"border-t border-sky-100 pt-3 text-xs leading-6 text-sky-800",children:["当前教学点",(0,m.jsxs)("span",{className:"mx-1 font-semibold",children:["(",ee.x,", ",ee.y,")"]}),eC?`对应 ${eC.label} 点`:"来自原图点击选择","。"]}),(0,m.jsxs)("div",{className:"mt-2 text-xs leading-6 text-slate-600",children:["正向变换后得到的目标图像坐标约为",(0,m.jsxs)("span",{className:"mx-1 font-semibold text-sky-700",children:["(",E(ew.destinationImage.x),", ",E(ew.destinationImage.y),")"]}),"，最近的像素位置为",(0,m.jsxs)("span",{className:"mx-1 font-semibold text-sky-700",children:["(",ew.roundedDestinationImage.x,", ",ew.roundedDestinationImage.y,")"]}),"。"]})]})]}),(0,m.jsx)(s.FlowColumn,{align:"end",children:(0,m.jsxs)(s.FlowNode,{tone:"emerald",className:"geo-anchor-output-node",children:[(0,m.jsxs)("div",{className:"mb-2 flex items-center justify-between gap-3",children:[(0,m.jsx)("span",{className:"text-[11px] font-semibold uppercase text-emerald-700",children:"输出像素写回"}),(0,m.jsxs)("span",{className:"text-[11px] text-emerald-700",children:["(",et.x,", ",et.y,")"]})]}),(0,m.jsxs)("div",{className:"border-t border-emerald-100 pt-3",children:[(0,m.jsx)("div",{className:"text-[10px] text-emerald-600",children:"当前插值方式"}),(0,m.jsx)("div",{className:"mt-1 text-sm font-semibold text-emerald-800",children:U[w]}),(0,m.jsx)("div",{className:"mt-1 font-mono text-lg font-bold text-emerald-700",children:E(ej.outputValue,3)})]}),(0,m.jsx)("div",{className:"mt-2 text-xs leading-6 text-slate-600",children:"nearest"===w?"最近邻插值只读取最接近的一个源像素，结果保持清晰，但边缘更容易出现锯齿。":"双线性插值综合 2×2 邻域加权平均，结果更平滑，但会引入轻微模糊。"})]})})]})}),eF=(0,m.jsxs)("div",{className:"space-y-4",children:[(0,m.jsxs)(d.TeachingCard,{children:[(0,m.jsxs)("div",{className:"grid gap-4",children:[(0,m.jsxs)("div",{children:[(0,m.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"几何变换的统一表达"}),(0,m.jsxs)("p",{className:"mt-2 text-xs leading-6 text-slate-500",children:["核心关系是",(0,m.jsx)(r.MathText,{mathML:A,className:"mx-1 inline-block text-slate-700"}),"。 真正生成输出图像时，程序通常不做“正向逐点写回”，而是对每个输出像素做反向映射，再查找原图中的采样位置。"]}),(0,m.jsx)(r.FormulaCard,{mathML:A,className:"mt-3",note:"图像内容本身不变，改变的是像素之间的位置关系。",tone:"embedded"})]}),(0,m.jsxs)("div",{children:[(0,m.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"齐次坐标矩阵"}),(0,m.jsx)(r.FormulaCard,{mathML:D,className:"mt-3",note:"平移项写入第三列后，平移、旋转、缩放和剪切就都能并入一次矩阵乘法。",tone:"embedded"})]})]}),(0,m.jsxs)("div",{className:"mt-4 grid gap-4",children:[(0,m.jsx)(r.FormulaCard,{mathML:Z("<mi>M</mi>",ex),label:"当前组合矩阵",note:`按 ${g.join(" → ")} 的顺序依次复合。`,tone:"embedded"}),(0,m.jsx)(r.FormulaCard,{mathML:Z("<msup><mi>M</mi><mrow><mo>-</mo><mn>1</mn></mrow></msup>",ec),label:"当前反向映射矩阵",note:"输出图像中的每一个像素，都先乘逆矩阵，再回到原图寻找采样位置。",tone:"embedded"})]}),(0,m.jsxs)("div",{className:"mt-4 grid gap-4",children:[(0,m.jsx)(r.FormulaCard,{mathML:z,label:"正交",note:"长度和夹角保持不变，常见代表是纯旋转或翻转。",tone:"embedded"}),(0,m.jsx)(r.FormulaCard,{mathML:O,label:"刚体",note:"在线性部分保持正交的前提下，再加入平移项。",tone:"embedded"}),(0,m.jsx)(r.FormulaCard,{mathML:V,label:"相似",note:"允许整体等比例缩放，因此角度不变、长度按同一比例变化。",tone:"embedded"}),(0,m.jsx)(r.FormulaCard,{mathML:Q,label:"仿射",note:"最一般的二维线性位置变换，可由平移、缩放、旋转、翻转、剪切复合得到。",tone:"embedded"})]})]}),(0,m.jsx)(d.TeachingCard,{children:(0,m.jsxs)("div",{className:"grid gap-4",children:[(0,m.jsxs)("div",{children:[(0,m.jsxs)("div",{className:"flex items-center justify-between gap-3",children:[(0,m.jsxs)("div",{children:[(0,m.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"教学点的正向坐标变换"}),(0,m.jsx)("p",{className:"mt-1 text-xs leading-6 text-slate-500",children:eC?`${eC.label} 点：${eC.description}`:"当前教学点来自原图点击。"})]}),(0,m.jsxs)("div",{className:"rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700",children:["源点 (",ee.x,", ",ee.y,")"]})]}),(0,m.jsx)(r.FormulaCard,{mathML:(e=ew.sourceCartesian,p=ew.transformedCartesian,(0,r.buildInlineMathML)(`
    <mrow>
      <msub><mi>p</mi><mi>dst</mi></msub>
      <mo>=</mo>
      <mi>M</mi><mo>&#x22C5;</mo><msub><mi>p</mi><mi>src</mi></msub>
      <mo>=</mo>
      ${q(ex)}
      <mo>&#x22C5;</mo>
      ${J([e.x,e.y,1])}
      <mo>=</mo>
      ${J([p.x,p.y,1])}
    </mrow>
  `)),className:"mt-3",note:"使用的是中心化后的笛卡尔坐标，因此正角度仍表示逆时针旋转。",tone:"embedded"})]}),(0,m.jsxs)("div",{className:"px-1 py-1",children:[(0,m.jsx)("div",{className:"text-xs font-semibold uppercase tracking-[0.12em] text-slate-500",children:"当前点映射结果"}),(0,m.jsxs)("div",{className:"mt-3 divide-y divide-slate-200 text-sm text-slate-700",children:[(0,m.jsxs)("div",{className:"py-2",children:["原图坐标：(",ee.x,", ",ee.y,")"]}),(0,m.jsxs)("div",{className:"py-2",children:["中心坐标：(",E(ew.sourceCartesian.x),", ",E(ew.sourceCartesian.y),")"]}),(0,m.jsxs)("div",{className:"py-2",children:["目标中心坐标：(",E(ew.transformedCartesian.x),", ",E(ew.transformedCartesian.y),")"]}),(0,m.jsxs)("div",{className:"py-2",children:["目标图像坐标：(",E(ew.destinationImage.x),", ",E(ew.destinationImage.y),")"]})]}),(0,m.jsx)("div",{className:"mt-3 border-l-4 border-amber-300 pl-3 text-xs leading-6 text-amber-800",children:ew.inBounds?"该点仍然落在结果图内部，可以在结果图上继续观察它附近的采样效果。":"该点已经移出结果图边界，这说明几何变换可能让部分内容离开画布范围。"})]})]})}),(0,m.jsxs)(d.TeachingCard,{children:[(0,m.jsxs)("div",{className:"flex flex-wrap items-start justify-between gap-3",children:[(0,m.jsxs)("div",{children:[(0,m.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"当前输出像素的反向映射与插值"}),(0,m.jsxs)("p",{className:"mt-1 text-xs leading-6 text-slate-500",children:["输出像素固定在",(0,m.jsxs)("span",{className:"mx-1 font-semibold text-emerald-700",children:["(",et.x,", ",et.y,")"]}),"，先通过逆矩阵回到原图，再根据插值方式取得灰度值。"]})]}),(0,m.jsxs)("div",{className:"rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700",children:["当前方式：",U[w]]})]}),(0,m.jsx)(r.FormulaCard,{mathML:(f=ej.destinationCartesian,j=ej.sourceCartesian,(0,r.buildInlineMathML)(`
    <mrow>
      <msub><mi>p</mi><mi>src</mi></msub>
      <mo>=</mo>
      <msup><mi>M</mi><mrow><mo>-</mo><mn>1</mn></mrow></msup>
      <mo>&#x22C5;</mo>
      <msub><mi>p</mi><mi>dst</mi></msub>
      <mo>=</mo>
      ${q(ec)}
      <mo>&#x22C5;</mo>
      ${J([f.x,f.y,1])}
      <mo>=</mo>
      ${J([j.x,j.y,1])}
    </mrow>
  `)),className:"mt-3",note:"给出的坐标仍然是中心化后的笛卡尔坐标，便于直接对应齐次矩阵公式。",tone:"embedded"}),(0,m.jsxs)("div",{className:"mt-4",children:[(0,m.jsxs)("div",{className:"text-xs font-semibold uppercase tracking-[0.12em] text-slate-500",children:[U[w],"插值"]}),(0,m.jsxs)("div",{className:"mt-3 flex flex-wrap items-center gap-4",children:[(0,m.jsx)(l.ImageCanvas,{image:eb,maxDisplaySize:132,showGrid:!0,highlightPixel:et}),(0,m.jsx)("div",{className:"min-w-0 flex-1",children:(0,m.jsx)(r.FormulaCard,{mathML:"nearest"===w?(v=eN.nearestSource)?(0,r.buildInlineMathML)(`
    <mrow>
      <mi>I</mi><mo>&#x2032;</mo><mo>(</mo><mn>${eN.x}</mn><mo>,</mo><mn>${eN.y}</mn><mo>)</mo>
      <mo>=</mo>
      <mi>I</mi><mo>(</mo><mn>${v.x}</mn><mo>,</mo><mn>${v.y}</mn><mo>)</mo>
      <mo>=</mo>
      <mn>${E(v.value)}</mn>
    </mrow>
  `):(0,r.buildInlineMathML)(`
      <mrow>
        <mi>I</mi><mo>&#x2032;</mo><mo>(</mo><mn>${eN.x}</mn><mo>,</mo><mn>${eN.y}</mn><mo>)</mo>
        <mo>=</mo>
        <mn>0</mn>
      </mrow>
    `):function(e){if(0===e.bilinearNeighbors.length)return(0,r.buildInlineMathML)(`
      <mrow>
        <mi>I</mi><mo>&#x2032;</mo><mo>(</mo><mn>${e.x}</mn><mo>,</mo><mn>${e.y}</mn><mo>)</mo>
        <mo>=</mo>
        <mn>0</mn>
      </mrow>
    `);let m=e.bilinearNeighbors.map(e=>`<mn>${E(e.weight)}</mn><mo>&#x22C5;</mo><mn>${E(e.value)}</mn>`).join("<mo>+</mo>");return(0,r.buildInlineMathML)(`
    <mrow>
      <mi>I</mi><mo>&#x2032;</mo><mo>(</mo><mn>${e.x}</mn><mo>,</mo><mn>${e.y}</mn><mo>)</mo>
      <mo>=</mo>
      ${m}
      <mo>=</mo>
      <mn>${E(e.outputValue)}</mn>
    </mrow>
  `)}(eN),formulaClassName:"rounded-xl px-4 py-4 shadow-none",note:"nearest"===w?"只取最接近的一个原图像素，速度快，但边缘更容易产生锯齿。":"同时利用 2×2 邻域的四个像素做加权平均，边缘更平滑，但会略微模糊。",tone:"embedded"})})]})]}),"bilinear"===w&&eM.bilinearNeighbors.length>0&&(0,m.jsxs)("div",{className:"mt-4 border-t border-slate-200 pt-4",children:[(0,m.jsx)("div",{className:"text-xs font-semibold uppercase tracking-[0.12em] text-slate-500",children:"双线性邻域权重"}),(0,m.jsx)("div",{className:"mt-3 grid gap-x-4 gap-y-3 md:grid-cols-4",children:eM.bilinearNeighbors.map(e=>(0,m.jsxs)("div",{className:"border-l border-slate-200 pl-3 text-xs leading-5 text-slate-700",children:[(0,m.jsx)("div",{className:"font-semibold text-slate-800",children:e.label}),(0,m.jsxs)("div",{children:["坐标：(",e.x,", ",e.y,")"]}),(0,m.jsxs)("div",{children:["灰度：",E(e.value,3)]}),(0,m.jsxs)("div",{children:["权重：",E(e.weight,3)]})]},`${e.label}-${e.x}-${e.y}`))})]})]}),(0,m.jsxs)(d.TeachingCard,{children:[(0,m.jsxs)("div",{className:"flex items-center justify-between gap-3",children:[(0,m.jsxs)("div",{children:[(0,m.jsx)("div",{className:"text-sm font-semibold text-slate-800",children:"原子变换矩阵"}),(0,m.jsx)("p",{className:"mt-1 text-xs leading-6 text-slate-500",children:"仿射变换可以由多个原子变换复合而成。下列矩阵与平移、缩放、旋转、翻转、剪切一一对应。"})]}),(0,m.jsxs)("div",{className:"rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600",children:["当前层级：",K[eu]]})]}),(0,m.jsxs)("div",{className:"mt-4 grid gap-4 md:grid-cols-2",children:[(0,m.jsx)(r.FormulaCard,{mathML:B,label:"平移",note:"控制整体位置，不改变形状和朝向。",tone:"embedded"}),(0,m.jsx)(r.FormulaCard,{mathML:H,label:"缩放",note:"等比例缩放对应相似变换的一部分。",tone:"embedded"}),(0,m.jsx)(r.FormulaCard,{mathML:W,label:"旋转 / 翻转",note:"旋转矩阵保持角度关系；翻转可看作某个坐标轴方向的符号取反，仍属于正交变换。",tone:"embedded"}),(0,m.jsx)(r.FormulaCard,{mathML:R,label:"剪切",note:"剪切会改变角度关系，因此会把相似变换推进到更一般的仿射变换。",tone:"embedded"})]})]})]}),eA=(0,t.useMemo)(()=>[{id:"source-region",tone:"red",from:{kind:"region",selector:".geo-anchor-input-main",x:ej.regionX,y:ej.regionY,size:ej.regionWidth,width:ej.regionWidth,height:ej.regionHeight,imageWidth:el,imageHeight:eo},to:{kind:"element",selector:".geo-anchor-source-node"}},{id:"matrix-flow",tone:"amber",from:{kind:"element",selector:".geo-anchor-main-operator"},to:{kind:"element",selector:".geo-anchor-matrix-node"}},{id:"output-flow",tone:"emerald",from:{kind:"pixel",selector:".geo-anchor-output-main",x:et.x,y:et.y,imageWidth:el,imageHeight:eo},to:{kind:"element",selector:".geo-anchor-output-node"}}],[et.x,et.y,ej.regionHeight,ej.regionWidth,ej.regionX,ej.regionY,eo,el]),eD=(0,m.jsxs)("div",{className:"space-y-4",children:[(0,m.jsxs)("div",{className:"border-l-4 border-blue-300 pl-3",children:[(0,m.jsx)("div",{className:"text-xs font-semibold text-blue-700",children:"当前参数层级"}),(0,m.jsx)("div",{className:"mt-1 text-sm font-semibold text-blue-800",children:K[eu]}),(0,m.jsxs)("p",{className:"mt-2 text-xs leading-5 text-blue-700",children:[(0,m.jsx)(x.TeachingTerm,{term:"正交",explanation:"保持长度和夹角，典型情况是纯旋转或翻转。"})," ⊂ ",(0,m.jsx)(x.TeachingTerm,{term:"刚体",explanation:"在保持形状不变的基础上允许平移，目标只换位置和朝向。"})," ⊂ ",(0,m.jsx)(x.TeachingTerm,{term:"相似",explanation:"允许整体等比例缩放，角度不变但长度按同一比例变化。"})," ⊂ ",(0,m.jsx)(x.TeachingTerm,{term:"仿射",explanation:"允许剪切和非等比例缩放，平行关系保留但角度可能改变。"}),"。当前层级会随着缩放是否等比例、是否存在剪切和平移而变化。"]})]}),(0,m.jsx)(o.SelectParam,{label:"插值方式",value:w,onChange:e=>_(e),options:[{value:"nearest",label:"最近邻插值"},{value:"bilinear",label:"双线性插值"}]}),(0,m.jsx)(o.SelectParam,{label:"翻转方式",value:M.flipMode,onChange:e=>eT("flipMode",e),options:[{value:"none",label:"不翻转"},{value:"horizontal",label:"水平翻转"},{value:"vertical",label:"垂直翻转"},{value:"both",label:"水平+垂直"}]}),(0,m.jsx)(o.SliderParam,{label:"平移 tx",value:M.translateX,onChange:e=>eT("translateX",e),min:-4,max:4,step:1}),(0,m.jsx)(o.SliderParam,{label:"平移 ty",value:M.translateY,onChange:e=>eT("translateY",e),min:-4,max:4,step:1}),(0,m.jsx)(o.SliderParam,{label:"旋转角度",value:M.rotationDeg,onChange:e=>eT("rotationDeg",e),min:-90,max:90,step:5,unit:"°"}),(0,m.jsx)(o.SliderParam,{label:"缩放 sx",value:M.scaleX,onChange:e=>eT("scaleX",e),min:.6,max:1.8,step:.1}),(0,m.jsx)(o.SliderParam,{label:"缩放 sy",value:M.scaleY,onChange:e=>eT("scaleY",e),min:.6,max:1.8,step:.1}),(0,m.jsx)(o.SliderParam,{label:"剪切 α",value:M.shearX,onChange:e=>eT("shearX",e),min:-.8,max:.8,step:.1}),(0,m.jsx)(o.SliderParam,{label:"剪切 β",value:M.shearY,onChange:e=>eT("shearY",e),min:-.8,max:.8,step:.1}),(0,m.jsxs)("div",{className:"border-t border-amber-200 pt-3 text-xs leading-5 text-amber-800",children:["当前处理流程固定为：源点正向映射到目标点，输出像素再通过",(0,m.jsx)(x.TeachingTerm,{term:"反向映射",explanation:"生成结果图时，先从输出像素回到原图坐标，再在原图采样，避免正向写回留下空洞。",className:"mx-1"}),"找采样来源。点击原图会选中一个教学点；点击结果图则查看当前输出像素从原图哪里采样。"]}),(0,m.jsxs)("div",{className:"border-t border-slate-200 pt-3",children:[(0,m.jsx)("div",{className:"text-xs font-semibold text-slate-600",children:"当前教学点"}),(0,m.jsxs)("div",{className:"mt-2 text-sm font-semibold text-slate-800",children:["(",ee.x,", ",ee.y,")"]}),(0,m.jsx)("div",{className:"mt-1 text-xs leading-5 text-slate-500",children:eC?`${eC.label} 点：${eC.description}`:"这是用户在原图中手动选择的点。"})]})]});return(0,m.jsx)(a.ConceptLayout,{title:"几何变换",subtitle:"Geometric Transform - 位置关系与插值采样",contentHeader:eX,operationLabel:"几何映射",parameterIntro:"调整平移、旋转、缩放、翻转和剪切后，重点观察两个问题：一个点如何被矩阵映射到新位置，以及结果图像为什么必须依赖插值。",originalImage:es,originalRgbImage:en,resultImage:eb,resultRgbImage:ey,parameters:eD,analysisPreview:eY,stepDetails:eF,visualOverlay:(0,m.jsx)(i.AnchoredOverlay,{paths:eA}),imageHints:{input:`红框表示当前输出像素在原图中的${ej.regionWidth}\xd7${ej.regionHeight}采样邻域；点击原图可选教学点`,output:"绿框表示当前输出像素；点击结果图可查看该像素的反向映射来源"},showOriginalGrid:!1,originalRegionMarker:"frame",currentStep:{x:et.x,y:et.y,kernelSize:1,regionX:ej.regionX,regionY:ej.regionY,regionWidth:ej.regionWidth,regionHeight:ej.regionHeight},stepInfo:{current:e$,total:eL},navigationHintText:"方向键移动输出像素 / 点击原图看正向映射 / 点击结果图看反向采样",onDirectionMove:eS,onInputRegionSelect:eP,onOutputPixelSelect:ek,codeTab:(0,m.jsx)(n.CodeViewer,{languages:[{name:"TypeScript",code:k}]}),singlePageScroll:!0})}],16952)}]);