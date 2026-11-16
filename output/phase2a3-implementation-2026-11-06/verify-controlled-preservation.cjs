const fs=require('fs'),path=require('path'),crypto=require('crypto');
const dir=__dirname,root=path.resolve(dir,'../..'),checkout=path.join(dir,'checkout');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const baseline=JSON.parse(fs.readFileSync(path.join(dir,'baseline-hashes.json'),'utf8'));
const originalDifferences=[],checkoutDifferences=[];
for(const row of baseline){for(const [location,base,diffs]of [['original',root,originalDifferences],['checkout',checkout,checkoutDifferences]]){const file=path.join(base,row.path);if(!fs.existsSync(file)||hash(file)!==row.sha256)diffs.push(row.path);}}
const result={checkedAt:new Date().toISOString(),baselineFiles:baseline.length,originalDifferences,checkoutDifferences,expectedCheckoutChanges:['backend/service.js'],preservedOriginal:originalDifferences.length===0,preservedUnrelatedCheckout:checkoutDifferences.length===1&&checkoutDifferences[0]==='backend/service.js',baselineServiceBackupMatches:hash(path.join(dir,'service.baseline.js'))===baseline.find(x=>x.path==='backend/service.js').sha256,inventoryCompletedBeforeApplicationEdit:fs.statSync(path.join(dir,'verified-writer-inventory.json')).mtimeMs<fs.statSync(path.join(checkout,'backend/service.js')).mtimeMs};
fs.writeFileSync(path.join(dir,'controlled-preservation-result.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
if(!result.preservedOriginal||!result.preservedUnrelatedCheckout||!result.baselineServiceBackupMatches||!result.inventoryCompletedBeforeApplicationEdit)process.exitCode=1;
