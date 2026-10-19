// Shared stage art direction keeps the page, board, and level picker in sync.
export const THEMES = [
  {id:'meadow',name:'MEADOW',scene:'meadow',sky:['#f4f8dc','#fcf9ec','#d9ecd4'],ink:'#304d37',muted:'#5a7258',accent:'#35713e',paddle:'#3d7847',grid:'#75946a',border:'#adc69d',panel:'#edf4df',ball:'#56327e',trail:'#8464a7',bricks:['#63a565','#e3a548','#bd74a1','#5dafa4','#9a78c4'],bonus:'#dfbe45'},
  {id:'sunset',name:'SUNSET',scene:'sunset',sky:['#ffe3d2','#fff1de','#f5cfdd'],ink:'#673347',muted:'#8b5360',accent:'#b4423e',paddle:'#b74144',grid:'#bc7b88',border:'#dfa6aa',panel:'#ffe5dd',ball:'#513078',trail:'#95639e',bricks:['#d66d49','#db9d3d','#b9678e','#9b72b1','#d38473'],bonus:'#e0b33b'},
  {id:'ocean',name:'OCEAN',scene:'ocean',sky:['#e0f6f1','#eefaf8','#c9e9f3'],ink:'#234c61',muted:'#4e7180',accent:'#246b82',paddle:'#237b84',grid:'#659da7',border:'#98c9d3',panel:'#dff1f5',ball:'#4d327e',trail:'#8964b1',bricks:['#3c9ca6','#528cc1','#5daf85','#9476c6','#d7924c'],bonus:'#d6bc41'},
  {id:'snow',name:'SNOW',scene:'snow',sky:['#edf2fc','#fafcff','#dce8f4'],ink:'#3c4567',muted:'#66758e',accent:'#4a62a5',paddle:'#536fb2',grid:'#90a3bd',border:'#b9c9e1',panel:'#e9effa',ball:'#693882',trail:'#a073b0',bricks:['#618fc5','#779bc1','#8a7dba','#59a7b0','#c58eae'],bonus:'#d2b63d'},
  {id:'space',name:'SPACE',scene:'space',sky:['#ece5fa','#f8f0fc','#dce2fa'],ink:'#493566',muted:'#79668b',accent:'#7549a4',paddle:'#7752b0',grid:'#a58ec0',border:'#c1acdb',panel:'#eee4f8',ball:'#384c87',trail:'#7b85bb',bricks:['#a06dc0','#667fbe','#cf7b9b','#649ca7','#cb9749'],bonus:'#d4b542'}
];
export const themeForLevel = level => THEMES[[0,2,3,4][Math.floor((level-1)/3)]] || THEMES[0];
