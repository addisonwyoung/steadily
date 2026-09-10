const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const elements=new Map();const element=()=>({innerHTML:'',textContent:'',style:{}});
const context={console,Date,JSON,Math,String,Object,Array,Error,crypto:require('node:crypto').webcrypto,setTimeout:()=>1,clearTimeout:()=>{},localStorage:{getItem:()=>null,setItem:(k,v)=>context.saved=JSON.parse(v)},document:{getElementById:id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id)},querySelectorAll:()=>[],addEventListener:()=>{}},window:{scrollTo:()=>{}}};vm.createContext(context);vm.runInContext(fs.readFileSync('dist/app.js','utf8'),context);
vm.runInContext(`
state.profile={name:'Test',barrier:'Distraction',priority:'a'};
const dates=recentDays(4);
state.habits=[{id:'a',title:'Walk',normal:'15 minutes',minimum:'2 minutes',time:'Morning',icon:'x',created:dates[0]}];
state.logs={[dates[0]]:{a:{type:'normal'}},[dates[1]]:{a:{type:'missed',reason:'Tiredness'}},[dates[2]]:{a:{type:'minimum'}}};
`,context);
let s=vm.runInContext('stats()',context);assert.equal(s.normal,1);assert.equal(s.minimum,1);assert.equal(s.total,4);assert.equal(s.returns,1);assert.equal(s.returnDays[0],1);
vm.runInContext("setHabit('a','minimum')",context);assert.equal(context.saved.logs[vm.runInContext('today',context)].a.type,'minimum');
assert.throws(()=>vm.runInContext("setHabit('unknown','normal')",context));assert.throws(()=>vm.runInContext("setHabit('a','bad')",context));
vm.runInContext("state.checks=Object.fromEntries(recentDays(3).map(d=>[d,{energy:1}]))",context);assert.match(vm.runInContext('recommendation()',context),/low energy/);
assert.match(vm.runInContext("esc('<script>')",context),/&lt;script&gt;/);
assert.match(vm.runInContext('dayPage()',context),/Your small steps/);assert.match(vm.runInContext('progressPage()',context),/Times you returned/);assert.match(vm.runInContext('challengePage()',context),/seven invitations/);assert.match(vm.runInContext('habitsPage()',context),/Edit habit/);
console.log('Passed: persistence, completion validation, recovery metrics, low-energy recommendations, escaping, and page rendering.');
