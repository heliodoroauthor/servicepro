import { readFileSync, writeFileSync } from 'fs';

// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// add-tiered-proposals.mjs
// Adds optional tiered proposal system (Good/Better/Best)
// to the Finance tab's estimate section.
// Core estimating is untouched â tiers are a separate flow.
// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const file = 'src/ServiceProApp.jsx';
let content = readFileSync(file, 'utf8');
const original = content;

// Guard: skip if already injected
if (content.includes('showTierModal')) {
  console.log('[add-tiered-proposals] Already injected, skipping.');
  process.exit(0);
}

// â STEP 1: Add state variables after estItems state â

const estItemsAnchor = '[estItems, setEstItems]';
const estItemsIdx = content.indexOf(estItemsAnchor);
if (estItemsIdx === -1) {
  console.log('[add-tiered-proposals] Could not find estItems state. Skipping.');
  process.exit(0);
}

// Find the end of the line containing estItems state
const estItemsLineEnd = content.indexOf('\n', estItemsIdx);

const tierStateCode = `
const [showTierModal, setShowTierModal] = React.useState(false);
const [tierProposals, setTierProposals] = React.useState([]);
const [activeTierProposal, setActiveTierProposal] = React.useState(null);
const [tierEditData, setTierEditData] = React.useState(null);
const [tierActivePicker, setTierActivePicker] = React.useState(null);
const [tierPickerSearch, setTierPickerSearch] = React.useState('');
const [tierCustomerView, setTierCustomerView] = React.useState(null);

const defaultTierPresets = [
{name:'Good', color:'#4ade80', icon:'\\u2714', items:[], description:'Essential service to resolve the issue.', warranty:'30-day workmanship warranty', notes:''},
{name:'Better', color:'#f59e0b', icon:'\\u2B50', items:[], description:'Enhanced service with improved parts and extended coverage.', warranty:'90-day parts & labor warranty', notes:'', recommended:true},
{name:'Best', color:'#a855f7', icon:'\\uD83D\\uDC8E', items:[], description:'Premium service with top-tier components and comprehensive coverage.', warranty:'1-year full warranty', notes:''}
];

const initTierEdit = (existingProposal) => {
if (existingProposal) {
setTierEditData(JSON.parse(JSON.stringify(existingProposal)));
} else {
setTierEditData({
id: Date.now(),
name: 'Tiered Proposal',
created: new Date().toISOString().slice(0,10),
status: 'draft',
tiers: JSON.parse(JSON.stringify(defaultTierPresets)),
activeTierIdx: 0
});
}
setShowTierModal(true);
};

const addTierToProposal = () => {
if (!tierEditData) return;
const newTier = {name:'Tier '+(tierEditData.tiers.length+1), color:'#60a5fa', icon:'\\u2795', items:[], description:'', warranty:'', notes:''};
setTierEditData({...tierEditData, tiers:[...tierEditData.tiers, newTier], activeTierIdx: tierEditData.tiers.length});
};

const removeTierFromProposal = (idx) => {
if (!tierEditData || tierEditData.tiers.length <= 2) return;
const newTiers = tierEditData.tiers.filter((_,i)=>i!==idx);
const newIdx = Math.min(tierEditData.activeTierIdx, newTiers.length-1);
setTierEditData({...tierEditData, tiers:newTiers, activeTierIdx:newIdx});
};

const updateTierField = (tierIdx, field, value) => {
if (!tierEditData) return;
const newTiers = [...tierEditData.tiers];
newTiers[tierIdx] = {...newTiers[tierIdx], [field]:value};
setTierEditData({...tierEditData, tiers:newTiers});
};

const addItemToTier = (tierIdx, item) => {
if (!tierEditData) return;
const newTiers = [...tierEditData.tiers];
const existing = newTiers[tierIdx].items.find(x=>x.name===item.name);
if (existing) {
existing.qty = (existing.qty||1)+1;
newTiers[tierIdx] = {...newTiers[tierIdx], items:[...newTiers[tierIdx].items]};
} else {
newTiers[tierIdx] = {...newTiers[tierIdx], items:[...newTiers[tierIdx].items, {...item, qty:item.qty||1}]};
}
setTierEditData({...tierEditData, tiers:newTiers});
};

const removeItemFromTier = (tierIdx, itemIdx) => {
if (!tierEditData) return;
const newTiers = [...tierEditData.tiers];
newTiers[tierIdx] = {...newTiers[tierIdx], items: newTiers[tierIdx].items.filter((_,i)=>i!==itemIdx)};
setTierEditData({...tierEditData, tiers:newTiers});
};

const updateTierItemQty = (tierIdx, itemIdx, qty) => {
if (!tierEditData) return;
const newTiers = [...tierEditData.tiers];
const newItems = [...newTiers[tierIdx].items];
newItems[itemIdx] = {...newItems[itemIdx], qty: Math.max(1, qty)};
newTiers[tierIdx] = {...newTiers[tierIdx], items: newItems};
setTierEditData({...tierEditData, tiers:newTiers});
};

const saveTierProposal = () => {
if (!tierEditData) return;
setTierProposals(prev => {
const exists = prev.find(p => p.id === tierEditData.id);
if (exists) return prev.map(p => p.id === tierEditData.id ? tierEditData : p);
return [...prev, tierEditData];
});
setShowTierModal(false);
setTierEditData(null);
};

const deleteTierProposal = (id) => {
setTierProposals(prev => prev.filter(p => p.id !== id));
};

const tierTotal = (tier) => tier.items.reduce((sum, it) => sum + (it.price||0)*(it.qty||1), 0);

	Ë^[YÛØÙ[\ËÝ\ÛÜÜÚ[\ËÜ\Ì\\ÚYØN
MYÉËÜ\Y]\ÎLÛÛÜÈØN
MYÉËÛÙZYÚÛÚ^NMX\Ú[ÜXÚÙÜÝ[Ý[Ü\[	ß_O^ÌQÐHÜX]HY\YÜÜØ[Ù]ÂÛÛ[HÛÛ[ÝXÝ[ÊÜX]Q\Ý[Q[
H
È	×È
ÈY\ÛÙH
ÈÛÛ[ÝXÝ[ÊÜX]Q\Ý[Q[
NÂÛÛÛÛKÙÊ	ÖØY]Y\Y\ÜÜØ[×HÕTYYÜX]HY\YÜÜØ[]ÛÊNÂBËÈ8 %ÕTÎYØ]YY\ÜÜØ[È\Ü^H
ÈÝ\ÝÛY\Ø\Y]È8 %ËÈ[Ù\Y\H\]Y\ÝÚYÛ]\H]Û\XKYÜH[[ÜKÔXÙHÛÚÈ]ÛÂÛÛÝ\TÚYÐ[ÚÜH	Ô\]Y\ÝÚYÛ]\IÎÂËÈ[HÙXÛÛØØÝ\[ÙH
\Ý\È[]ÙXÛÛ\È[[[ÙHXB]\TÚYÒYHÛÛ[[^Ù\TÚYÐ[ÚÜNÂY
\TÚYÒYOOHLJHÂËÈ[HØØÝ\[ÙH]	ÜÈX\HÜX]H\Ý[X]H]Û\XBÛÛÝÜX]Q\ÝÜÈHÛÛ[[^Ù	ÐÜX]HY\YÜÜØ[	ÊNÂY
ÜX]Q\ÝÜÈOOHLJHÂ\TÚYÒYHÛÛ[[^Ù\TÚYÐ[ÚÜÜX]Q\ÝÜÊNÂBBY
\TÚYÒYOOHLJHÂÛÛÝ\TÚYÓ[Q[HÛÛ[[^Ù	×Ë\TÚYÒY
NÂÛÛÝY\\Ü^PÛÙHHÝY\ÜÜØ[Ë[Ý	]Ý[O^ÞÛX\Ú[ÜM_O]Ý[O^ÞÙÛÚ^NLKÛÙZYÚÌ]\ÜXÚ[ÎKÛÛÜÈÎMLØ	ËX\Ú[ÝÛN^[ÙÜNÝ\\Ø\ÙIß_OY\YÜÜØ[ÏÙ]ÝY\ÜÜØ[ËX\
O]Ù^O^ÝYHÛ\ÜÓ[YOHØ\Ý[O^ÞÜY[ÎMX\Ú[ÝÛNÜ\Ì\ÛÛYÌÌÍMMIËÜ\Y]\ÎL_O]Ý[O^ÞÙ\Ü^NÙ^	Ë\ÝYPÛÛ[ÜÜXÙKX]ÙY[Ë[YÛ][\ÎØÙ[\ËX\Ú[ÝÛN_O]Ý[O^ÞÙÛÙZYÚÌÛÚ^NM__OÝ[Y_OÙ]]Ý[O^ÞÙ\Ü^NÙ^	ËØ\[YÛ][\ÎØÙ[\ß_OÜ[Û\ÜÓ[YOHYÙHÝ[O^ÞØXÚÙÜÝ[Ý]\ÏOOIÜÙ[	ÏÉÈÌMÙXÎÝ]\ÏOOIØ\ÝY	ÏÉÈÌMLÍIÎÈÍ
ÍMMIËÛÛÜÈÙËY[ÎÌ	ËÜ\Y]\ÎÛÚ^NLK^[ÙÜNÝ\\Ø\ÙIß_OÝÝ]\ßOÜÜ[Ü[Ý[O^ÞÙÛÚ^NLKÛÛÜÈÍ
Íß_OÝÜX]YOÜÜ[Ù]Ù]]Ý[O^ÞÙ\Ü^NÙ^	ËØ\^Ü\ÝÜ\	ËX\Ú[ÝÛNL_OÝY\ËX\

JOO]Ù^O^Ú_HÝ[O^ÞØXÚÙÜÝ[ÛÛÜÉÌN	ËÜ\Ì\ÛÛY	ÊÝÛÛÜÉÍ
	ËÜ\Y]\ÎY[ÎÍL	ËÛÚ^NL_OÜ[Ý[O^ÞØÛÛÜÛÛÜÛÙZYÚ_OÝXÛÛHÝ[Y_OÜÜ[Ü[Ý[O^ÞØÛÛÜÈÎMLØ	ËX\Ú[Y_OÝÚ[ÝËÕTSÖ_	É	ß^ÝY\Ý[

KÑ^Y
_OÜÜ[Ù]_BÙ]]Ý[O^ÞÙ\Ü^NÙ^	ËØ\_O]ÛÛXÚÏ^Ê
OO[]Y\Y]

_HÛ\ÜÓ[YOH\ÛHÝ[O^ÞÙ^K^[YÛØÙ[\ËY[ÎÎ	ËXÚÙÜÝ[ÈÌYLLØËÜ\Y]\ÎÝ\ÛÜÜÚ[\ËÛÚ^NLÛÛÜÈÙLN	ß_OY]Ù]]ÛÛXÚÏ^Ê
OOÙ]Y\Ý\ÝÛY\Y]Ê
_HÛ\ÜÓ[YOH\ÛHÝ[O^ÞÙ^K^[YÛØÙ[\ËY[ÎÎ	ËXÚÙÜÝ[ÈÍØÌØYY	ËÜ\Y]\ÎÝ\ÛÜÜÚ[\ËÛÚ^NLÛÛÜÈÙß_OÝ\ÝÛY\]Y]ÏÙ]]ÛÛXÚÏ^Ê
OOÚYÛÛ\J	Ñ[]H\ÈY\YÜÜØ[ÉÊJY[]UY\ÜÜØ[
Y
__HÛ\ÜÓ[YOH\ÛHÝ[O^ÞÝ^[YÛØÙ[\ËY[ÎÎL	ËXÚÙÜÝ[ÈÌYLLØËÜ\Y]\ÎÝ\ÛÜÜÚ[\ËÛÚ^NLÛÛÜÈÙY


	ß_OLÌMOÙ]Ù]Ù]_BÙ]BÝY\Ý\ÝÛY\Y]È	]Ý[O^ÞÜÜÚ][ÛÙ^Y	ËÜYYÚÝÛNXÚÙÜÝ[ÜØJÊIË[^NNNK\Ü^NÙ^	Ë[YÛ][\ÎØÙ[\Ë\ÝYPÛÛ[ØÙ[\ËY[Î_HÛÛXÚÏ^ÙOOÚYK\Ù]OOYKÝ\[\Ù]
\Ù]Y\Ý\ÝÛY\Y]Ê[
__O]Ý[O^ÞØXÚÙÜÝ[ÈÌMÌIËÜ\Y]\ÎMY[ÎX^ÚYLÚYÌL	IËX^ZYÚÎL	ËÝ\ÝÎØ]]ÉËÜ\Ì\ÛÛYÌÌÍMMIß_O]Ý[O^ÞÙ\Ü^NÙ^	Ë\ÝYPÛÛ[ÜÜXÙKX]ÙY[Ë[YÛ][\ÎØÙ[\ËX\Ú[ÝÛNM_O]Ý[O^ÞÙÛÚ^NNÛÙZYÚÌÛÛÜÈÙYYIß_OÚÛÜÙH[Ý\Ù\XÙHXÚØYÙOÙ]]ÛÛXÚÏ^Ê
OOÙ]Y\Ý\ÝÛY\Y]Ê[
_HÝ[O^ÞØÝ\ÛÜÜÚ[\ËÛÚ^NÛÛÜÈÎMLØ	ß_OLÌMOÙ]Ù]]Ý[O^ÞÙ\Ü^NÙ^	ËØ\X\Ú[ÝÛNMÜ\ÝÛNÌ\ÛÛYÌYLLØËY[ÐÝÛN_OÝY\Ý\ÝÛY\Y]ËY\ËX\

JOO]Ù^O^Ú_HÛÛXÚÏ^Ê
OOÙ]XÝ]UY\ÜÜØ[
J_HÝ[O^ÞÙ^K^[YÛØÙ[\ËY[ÎÌL	ËÜ\Y]\ÎLÝ\ÛÜÜÚ[\ËXÚÙÜÝ[XÝ]UY\ÜÜØ[OOZOÝÛÛÜÉÌÎÝ[Ü\[	ËÜ\XÝ]UY\ÜÜØ[OOZOÉÌÛÛY	ÊÝÛÛÜÌÛÛY[Ü\[	ËÜÚ][ÛÜ[]]IË[Ú][ÛØ[Éß_O]Ý[O^ÞÙÛÚ^NMX\Ú[ÝÛN_OÝXÛÛOÙ]]Ý[O^ÞÙÛÙZYÚÌÛÚ^NLËÛÛÜÛÛÜ_OÝ[Y_OÙ]ÝXÛÛ[Y[Y	]Ý[O^ÞÜÜÚ][ÛØXÛÛ]IËÜNYÚMXÚÙÜÝ[ÈÙNYLËÛÛÜÈÌ	ËÛÚ^NKÛÙZYÚY[ÎÌ\
	ËÜ\Y]\Î^[ÙÜNÝ\\Ø\ÙIß_O\Ý[YOÙ]BÙ]_BÙ]ÝY\Ý\ÝÛY\Y]ËY\ÖØXÝ]UY\ÜÜØ[H	


HOÂÛÛÝHY\Ý\ÝÛY\Y]ËY\ÖØXÝ]UY\ÜÜØ[NÂ]\]]Ý[O^ÞØÛÛÜÈÎMLØ	ËÛÚ^NLËX\Ú[ÝÛNL[RZYÚK__OÝ\ØÜ\[ÛOÙ]Ý][\Ë[Ý	]Ý[O^ÞÛX\Ú[ÝÛNL_OÝ][\ËX\

]OO]Ù^O^ÚHÝ[O^ÞÙ\Ü^NÙ^	Ë\ÝYPÛÛ[ÜÜXÙKX]ÙY[ËY[ÎÎ	ËÜ\ÝÛNÌ\ÛÛYÌYLLØËÛÚ^NLß_OÜ[Ý[O^ÞØÛÛÜÈÙLN	ß_OÚ][Y_HÚ]]OOÉ×L
ÉÊÚ]]NÉßOÜÜ[Ü[Ý[O^ÞØÛÛÜÈÎMLØ	ËÛÙZYÚ_OÝÚ[ÝËÕTSÖ_	É	ß^Ê
]XÙ_
J]]_JJKÑ^Y
_OÜÜ[Ù]_BÙ]B]Ý[O^ÞÙ\Ü^NÙ^	Ë\ÝYPÛÛ[ÜÜXÙKX]ÙY[ËY[ÎÌL	ËÜ\ÜÌÛÛY	ÊÝÛÛÜX\Ú[Ü_OÜ[Ý[O^ÞÙÛÙZYÚÌÛÚ^NMKÛÛÜÈÙYYIß_OÝ[ÜÜ[Ü[Ý[O^ÞÙÛÙZYÚÌÛÚ^NMKÛÛÜÛÛÜ_OÝÚ[ÝËÕTSÖ_	É	ß^ÝY\Ý[

KÑ^Y
_OÜÜ[Ù]ÝØ\[H	]Ý[O^ÞÛX\Ú[ÜY[ÎÎL	ËXÚÙÜÝ[ÈÌYLLØËÜ\Y]\ÎÛÚ^NLÛÛÜÈÎMLØ	ß_O^ÌQL_HÝØ\[_OÙ]BÝÝ\È	]Ý[O^ÞÛX\Ú[ÜY[ÎÎL	ËXÚÙÜÝ[ÈÌYLLØËÜ\Y]\ÎÛÚ^NLÛÛÜÈÎMLØ	ß_O^ÌQHÝÝ\ßOÙ]B]ÛÛXÚÏ^Ê
OOÜÙ]Y\ÜÜØ[Ê]O]X\
OYOO]Y\Ý\ÝÛY\Y]ËYÞËÝ]\ÎØ\ÝY	ËÙ[XÝYY\XÝ]UY\ÜÜØ[N
JNÜÙ]Y\Ý\ÝÛY\Y]Ê[
__HÛ\ÜÓ[YOHÝ[O^ÞÝÚYÌL	IËX\Ú[ÜMY[ÎÌM	Ë^[YÛØÙ[\ËXÚÙÜÝ[ÛÛÜÛÛÜÛÛÜOOIÈÙNYLÏÉÈÌ	ÎÈÙËÛÙZYÚÌÛÚ^NMKÜ\Y]\ÎLÝ\ÛÜÜÚ[\ß_OÙ[XÝÝ[Y_HXÚØYÙOÙ]Ù]ÂJJ
_BÙ]Ù]XÂÛÛ[HÛÛ[ÝXÝ[Ê\TÚYÓ[Q[
H
È	×È
ÈY\\Ü^PÛÙH
ÈÛÛ[ÝXÝ[Ê\TÚYÓ[Q[
NÂÛÛÛÛKÙÊ	ÖØY]Y\Y\ÜÜØ[×HÕTÎYYY\ÜÜØ[È\Ü^H
ÈÝ\ÝÛY\Y]ËÊNÂBËÈ8 %ÕT
YHY\YÜÜØ[Y]Ü[Ù[8 %ËÈ[Ù\YÜHHÛÜÚ[ÈÙHÛÛ\Û[	ÜÈ]\
[H[XXHÜÝ
BËÈÙIÛ[Ù\]YÚYÜHH\ÝØØÝ\[ÙHÙH\Ý[X]H[Ù[\XBÛÛÝY\[Ù[ÛÙHHÜÚÝÕY\[Ù[	Y\Y]]H	]Ý[O^ÞÜÜÚ][ÛÙ^Y	ËÜYYÚÝÛNXÚÙÜÝ[ÜØJÊIË[^NNN\Ü^NÙ^	Ë[YÛ][\ÎØÙ[\Ë\ÝYPÛÛ[ØÙ[\ËY[Î_HÛÛXÚÏ^ÙOOÚYK\Ù]OOYKÝ\[\Ù]
^ÜÙ]ÚÝÕY\[Ù[
[ÙJNÜÙ]Y\Y]]J[
___O]Ý[O^ÞØXÚÙÜÝ[ÈÌMÌIËÜ\Y]\ÎMY[ÎX^ÚYÌÚYÌL	IËX^ZYÚÎL	ËÝ\ÝÎØ]]ÉËÜ\Ì\ÛÛYÌÌÍMMIß_O]Ý[O^ÞÜY[ÎÌ	ËÜ\ÝÛNÌ\ÛÛYÌYLLØË\Ü^NÙ^	Ë\ÝYPÛÛ[ÜÜXÙKX]ÙY[Ë[YÛ][\ÎØÙ[\ß_O]Ý[O^ÞÙÛÚ^NNÛÙZYÚÌÛÛÜÈÙYYIß_OÝY\Y]]KY	Y\ÜÜØ[Ë[
OYOO]Y\Y]]KY
HÈ	ÑY]	È	ÐÜX]IßHY\YÜÜØ[Ù]]ÛÛXÚÏ^Ê
OOÜÙ]ÚÝÕY\[Ù[
[ÙJNÜÙ]Y\Y]]J[
__HÝ[O^ÞØÝ\ÛÜÜÚ[\ËÛÚ^NÛÛÜÈÎMLØ	Ë[RZYÚ__OLÌMOÙ]Ù]]Ý[O^ÞÜY[ÎÌM	ß_O]Ý[O^ÞÛX\Ú[ÝÛNL_O]Ý[O^ÞÙÛÚ^NLKÛÙZYÚÌ]\ÜXÚ[ÎKÛÛÜÈÍ
ÍËX\Ú[ÝÛN^[ÙÜNÝ\\Ø\ÙIß_OÜÜØ[[YOÙ][]Û\ÜÓ[YOH[[YO^ÝY\Y]]K[Y_HÛÚ[ÙO^ÙOOÙ]Y\Y]]JËY\Y]]K[YNK\Ù][Y_J_HÝ[O^ÞÝÚYÌL	IËY[ÎÌLL	ËXÚÙÜÝ[ÈÌYLLØËÜ\Ì\ÛÛYÌÌÍMMIËÜ\Y]\ÎÛÛÜÈÙYYIËÛÚ^NM_HÏÙ]]Ý[O^ÞÙ\Ü^NÙ^	ËØ\X\Ú[ÝÛNL^Ü\ÝÜ\	Ë[YÛ][\ÎØÙ[\ß_OÝY\Y]]KY\ËX\

JOO]Ù^O^Ú_HÛÛXÚÏ^Ê
OOÙ]Y\Y]]JËY\Y]]KXÝ]UY\Y_J_HÝ[O^ÞÙ\Ü^NÙ^	Ë[YÛ][\ÎØÙ[\ËØ\Y[ÎÎM	ËÜ\Y]\ÎLÝ\ÛÜÜÚ[\ËXÚÙÜÝ[Y\Y]]KXÝ]UY\YOOZOÝÛÛÜÉÌÎÈÌYLLØËÜ\Y\Y]]KXÝ]UY\YOOZOÉÌÛÛY	ÊÝÛÛÜÌÛÛYÌÌÍMMIË[Ú][ÛØ[Éß_OÜ[Ý[O^ÞÙÛÚ^NM_OÝXÛÛOÜÜ[Ü[Ý[O^ÞÙÛÙZYÚÛÚ^NLËÛÛÜY\Y]]KXÝ]UY\YOOZOÝÛÛÜÈÎMLØ	ß_OÝ[Y_OÜÜ[Ù]_BÝY\Y]]KY\Ë[Ý
H	]ÛÛXÚÏ^ØYY\ÔÜÜØ[HÝ[O^ÞÜY[ÎÎM	ËÜ\Y]\ÎLÝ\ÛÜÜÚ[\ËÜ\Ì\ÚYÌÌÍMMIËÛÚ^NLËÛÛÜÈÍ
Íß_OÈYY\Ù]BÙ]Ê

HOÂÛÛÝHHY\Y]]KXÝ]UY\YÂÛÛÝY\HY\Y]]KY\ÖÝWNÂY
]Y\H]\[Â]\]Ý[O^ÞØÜ\Ì\ÛÛYÌÌÍMMIËÜ\Y]\ÎLY[ÎMXÚÙÜÝ[ÈÌMÌIß_O]Ý[O^ÞÙ\Ü^NÙ^	ËØ\X\Ú[ÝÛNL_O]Ý[O^ÞÙ^__O]Ý[O^ÞÙÛÚ^NLKÛÙZYÚÌ]\ÜXÚ[ÎKÛÛÜÈÍ
ÍËX\Ú[ÝÛN^[ÙÜNÝ\\Ø\ÙIß_OY\[YOÙ][]Û\ÜÓ[YOH[[YO^ÝY\[Y_HÛÚ[ÙO^ÙOO\]UY\Y[
K	Û[YIËK\Ù][YJ_HÝ[O^ÞÝÚYÌL	IËY[ÎÎL	ËXÚÙÜÝ[ÈÌYLLØËÜ\Ì\ÛÛYÌÌÍMMIËÜ\Y]\ÎÛÛÜÈÙYYIËÛÚ^NLß_HÏÙ]]Ý[O^ÞÝÚY_O]Ý[O^ÞÙÛÚ^NLKÛÙZYÚÌ]\ÜXÚ[ÎKÛÛÜÈÍ
ÍËX\Ú[ÝÛN^[ÙÜNÝ\\Ø\ÙIß_OÛÛÜÙ][]\OHÛÛÜ[YO^ÝY\ÛÛÜHÛÚ[ÙO^ÙOO\]UY\Y[
K	ØÛÛÜËK\Ù][YJ_HÝ[O^ÞÝÚYÌL	IËZYÚÍKY[ÎXÚÙÜÝ[ÈÌYLLØËÜ\Ì\ÛÛYÌÌÍMMIËÜ\Y]\ÎÝ\ÛÜÜÚ[\ß_HÏÙ]ÝY\Y]]KY\Ë[Ý	]Ý[O^ÞÙ\Ü^NÙ^	Ë[YÛ][\ÎÙ^Y[	ËY[ÐÝÛN_O]ÛÛXÚÏ^Ê
OO[[ÝUY\ÛTÜÜØ[
J_HÝ[O^ÞÜY[ÎÎL	ËXÚÙÜÝ[ÈÌYLLØËÜ\Y]\ÎÝ\ÛÜÜÚ[\ËÛÛÜÈÙY


	ËÛÚ^NL_OLÌMOÙ]Ù]BÙ]]Ý[O^ÞÛX\Ú[ÝÛNL_O]Ý[O^ÞÙÛÚ^NLKÛÙZYÚÌ]\ÜXÚ[ÎKÛÛÜÈÍ
ÍËX\Ú[ÝÛN^[ÙÜNÝ\\Ø\ÙIß_O\ØÜ\[ÛÙ]^\XHÛ\ÜÓ[YOH[[YO^ÝY\\ØÜ\[ÛHÛÚ[ÙO^ÙOO\]UY\Y[
K	Ù\ØÜ\[ÛËK\Ù][YJ_HÝÜÏ^ÌHÝ[O^ÞÝÚYÌL	IËY[ÎÎL	ËXÚÙÜÝ[ÈÌYLLØËÜ\Ì\ÛÛYÌÌÍMMIËÜ\Y]\ÎÛÛÜÈÙYYIËÛÚ^NLË\Ú^NÝ\XØ[	ß_HÏÙ]]Ý[O^ÞÙ\Ü^NÙ^	ËØ\X\Ú[ÝÛNL_O]Ý[O^ÞÙ^__O]Ý[O^ÞÙÛÚ^NLKÛÙZYÚÌ]\ÜXÚ[ÎKÛÛÜÈÍ
ÍËX\Ú[ÝÛN^[ÙÜNÝ\\Ø\ÙIß_OØ\[OÙ][]Û\ÜÓ[YOH[[YO^ÝY\Ø\[_HÛÚ[ÙO^ÙOO\]UY\Y[
K	ÝØ\[IËK\Ù][YJ_HÝ[O^ÞÝÚYÌL	IËY[ÎÎL	ËXÚÙÜÝ[ÈÌYLLØËÜ\Ì\ÛÛYÌÌÍMMIËÜ\Y]\ÎÛÛÜÈÙYYIËÛÚ^NLß_HÏÙ]]Ý[O^ÞÙ^__O]Ý[O^ÞÙÛÚ^NLKÛÙZYÚÌ]\ÜXÚ[ÎKÛÛÜÈÍ
ÍËX\Ú[ÝÛN^[ÙÜNÝ\\Ø\ÙIß_OÝ\ÏÙ][]Û\ÜÓ[YOH[[YO^ÝY\Ý\ßHÛÚ[ÙO^ÙOO\]UY\Y[
K	ÛÝ\ÉËK\Ù][YJ_HÝ[O^ÞÝÚYÌL	IËY[ÎÎL	ËXÚÙÜÝ[ÈÌYLLØËÜ\Ì\ÛÛYÌÌÍMMIËÜ\Y]\ÎÛÛÜÈÙYYIËÛÚ^NLß_HÏÙ]Ù]]Ý[O^ÞÙ\Ü^NÙ^	Ë[YÛ][\ÎØÙ[\ËØ\X\Ú[ÝÛN_O[]\OHÚXÚØÞÚXÚÙY^ÈH]Y\XÛÛ[Y[YHÛÚ[ÙO^ÙOO\]UY\Y[
K	ÜXÛÛ[Y[Y	ËK\Ù]ÚXÚÙY
_HÝ[O^ÞØXØÙ[ÛÛÜY\ÛÛÜ_HÏÜ[Ý[O^ÞÙÛÚ^NLÛÛÜÈÎMLØ	ß_OX\È\ÈXÛÛ[Y[Y
\Ý[YJOÜÜ[Ù]]Ý[O^ÞÙÛÚ^NLKÛÙZYÚÌ]\ÜXÚ[ÎKÛÛÜÈÍ
ÍËX\Ú[ÝÛNX\Ú[ÜL^[ÙÜNÝ\\Ø\ÙIß_O[H][\ÏÙ]ÝY\][\Ë[ÝOOL	]Ý[O^ÞÝ^[YÛØÙ[\ËY[ÎÌM	ËÛÛÜÈÍ
ÍMMIËÛÚ^NLß_OÈ][\ÈY]YÛH[[ÜHÜ[\X[X[KÙ]BÝY\][\ËX\

]HO]Ù^O^ÚHÝ[O^ÞÙ\Ü^NÙ^	Ë[YÛ][\ÎØÙ[\ËØ\Y[ÎÎ	ËÜ\ÝÛNÌ\ÛÛYÌYLLØß_O]Ý[O^ÞÙ^KÛÚ^NLËÛÛÜÈÙLN	ß_OÚ][Y_OÙ]]Ý[O^ÞÙ\Ü^NÙ^	Ë[YÛ][\ÎØÙ[\ËØ\_O]ÛÛXÚÏ^Ê
OO\]UY\][T]JK
]]_JKLJ_HÝ[O^ÞÝÚYZYÚ\Ü^NÙ^	Ë[YÛ][\ÎØÙ[\Ë\ÝYPÛÛ[ØÙ[\ËXÚÙÜÝ[ÈÌYLLØËÜ\Y]\ÎÝ\ÛÜÜÚ[\ËÛÛÜÈÎMLØ	ËÛÚ^NM_OOÙ]Ü[Ý[O^ÞÙÛÚ^NLËÛÛÜÈÙLN	ËZ[ÚY^[YÛØÙ[\ß_OÚ]]__OÜÜ[]ÛÛXÚÏ^Ê
OO\]UY\][T]JK
]]_JJÌJ_HÝ[O^ÞÝÚYZYÚ\Ü^NÙ^	Ë[YÛ][\ÎØÙ[\Ë\ÝYPÛÛ[ØÙ[\ËXÚÙÜÝ[ÈÌYLLØËÜ\Y]\ÎÝ\ÛÜÜÚ[\ËÛÛÜÈÎMLØ	ËÛÚ^NM_OÏÙ]Ù]]Ý[O^ÞÙÛÚ^NLËÛÛÜÈÎMLØ	ËZ[ÚY^[YÛÜYÚ	ß_OÝÚ[ÝËÕTSÖ_	É	ß^Ê
]XÙ_
J]]_JJKÑ^Y
_OÙ]]ÛÛXÚÏ^Ê
OO[[ÝR][QÛUY\K_HÝ[O^ÞØÝ\ÛÜÜÚ[\ËÛÛÜÈÙY



// ————————————————————————————————————————————————————————————
// add-tiered-proposals.mjs
// Adds optional tiered proposal system (Good/Better/Best)
// to the Finance tab's estimate section.
// Core estimating is untouched — tiers are a separate flow.
// ————————————————————————————————————————————————————————————

const file = 'src/ServiceProApp.jsx';
let content = readFileSync(file, 'utf8');
const original = content;

// Guard: skip if already injected
if (content.includes('showTierModal')) {
  console.log('[add-tiered-proposals] Already injected, skipping.');
  process.exit(0);
}

// — STEP 1: Add state variables after estItems state —

const estItemsAnchor = '[estItems, setEstItems]';
const estItemsIdx = content.indexOf(estItemsAnchor);
if (estItemsIdx === -1) {
  console.log('[add-tiered-proposals] Could not find estItems state. Skipping.');
  process.exit(0);
}

// Find the end of the line containing estItems state
const estItemsLineEnd = content.indexOf('\n', estItemsIdx);

const tierStateCode = `
const [showTierModal, setShowTierModal] = React.useState(false);
const [tierProposals, setTierProposals] = React.useState([]);
const [activeTierProposal, setActiveTierProposal] = React.useState(null);
const [tierEditData, setTierEditData] = React.useState(null);
const [tierActivePicker, setTierActivePicker] = React.useState(null);
const [tierPickerSearch, setTierPickerSearch] = React.useState('');
const [tierCustomerView, setTierCustomerView] = React.useState(null);

const defaultTierPresets = [
{name:'Good', color:'#4ade80', icon:'\\u2714', items:[], description:'Essential service to resolve the issue.', warranty:'30-day workmanship warranty', notes:''},
{name:'Better', color:'#f59e0b', icon:'\\u2B50', items:[], description:'Enhanced service with improved parts and extended coverage.', warranty:'90-day parts & labor warranty', notes:'', recommended:true},
{name:'Best', color:'#a855f7', icon:'\\uD83D\\uDC8E', items:[], description:'Premium service with top-tier components and comprehensive coverage.', warranty:'1-year full warranty', notes:''}
];

const initTierEdit = (existingProposal) => {
if (existingProposal) {
setTierEditData(JSON.parse(JSON.stringify(existingProposal)));
} else {
setTierEditData({
id: Date.now(),
name: 'Tiered Proposal',
created: new Date().toISOString().slice(0,10),
status: 'draft',
tiers: JSON.parse(JSON.stringify(defaultTierPresets)),
activeTierIdx: 0
});
}
setShowTierModal(true);
};

const addTierToProposal = () => {
if (!tierEditData) return;
const newTier = {name:'Tier '+(tierEditData.tiers.length+1), color:'#60a5fa', icon:'\\u2795', items:[], description:'', warranty:'', notes:''};
setTierEditData({...tierEditData, tiers:[...tierEditData.tiers, newTier], activeTierIdx: tierEditData.tiers.length});
};

const removeTierFromProposal = (idx) => {
if (!tierEditData || tierEditData.tiers.length <= 2) return;
const newTiers = tierEditData.tiers.filter((_,i)=>i!==idx);
const newIdx = Math.min(tierEditData.activeTierIdx, newTiers.length-1);
setTierEditData({...tierEditData, tiers:newTiers, activeTierIdx:newIdx});
};

const updateTierField = (tierIdx, field, value) => {
if (!tierEditData) return;
const newTiers = [...tierEditData.tiers];
newTiers[tierIdx] = {...newTiers[tierIdx], [field]:value};
setTierEditData({...tierEditData, tiers:newTiers});
};

const addItemToTier = (tierIdx, item) => {
if (!tierEditData) return;
const newTiers = [...tierEditData.tiers];
const existing = newTiers[tierIdx].items.find(x=>x.name===item.name);
if (existing) {
existing.qty = (existing.qty||1)+1;
newTiers[tierIdx] = {...newTiers[tierIdx], items:[...newTiers[tierIdx].items]};
} else {
newTiers[tierIdx] = {...newTiers[tierIdx], items:[...newTiers[tierIdx].items, {...item, qty:item.qty||1}]};
}
setTierEditData({...tierEditData, tiers:newTiers});
};

const removeItemFromTier = (tierIdx, itemIdx) => {
if (!tierEditData) return;
const newTiers = [...tierEditData.tiers];
newTiers[tierIdx] = {...newTiers[tierIdx], items: newTiers[tierIdx].items.filter((_,i)=>i!==itemIdx)};
setTierEditData({...tierEditData, tiers:newTiers});
};

const updateTierItemQty = (tierIdx, itemIdx, qty) => {
if (!tierEditData) return;
const newTiers = [...tierEditData.tiers];
const newItems = [...newTiers[tierIdx].items];
newItems[itemIdx] = {...newItems[itemIdx], qty: Math.max(1, qty)};
newTiers[tierIdx] = {...newTiers[tierIdx], items: newItems};
setTierEditData({...tierEditData, tiers:newTiers});
};

const saveTierProposal = () => {
if (!tierEditData) return;
setTierProposals(prev => {
const exists = prev.find(p => p.id === tierEditData.id);
if (exists) return prev.map(p => p.id === tierEditData.id ? tierEditData : p);
return [...prev, tierEditData];
});
setShowTierModal(false);
setTierEditData(null);
};

const deleteTierProposal = (id) => {
setTierProposals(prev => prev.filter(p => p.id !== id));
};

const tierTotal = (tier) => tier.items.reduce((sum, it) => sum + (it.price||0)*(it.qty||1), 0);
`;

content = content.substring(0, estItemsLineEnd) + '\n' + tierStateCode + content.substring(estItemsLineEnd);
console.log('[add-tiered-proposals] STEP 1: Added tier state variables.');


// — STEP 2: Add "Create Tiered Proposal" button next to "+ Create Estimate" —

const createEstAnchor = '+ Create Estimate';
const createEstIdx = content.indexOf(createEstAnchor);
if (createEstIdx === -1) {
  console.log('[add-tiered-proposals] Could not find Create Estimate button. Skipping step 2.');
} else {
  // Find the end of the line containing "+ Create Estimate"
  const createEstLineEnd = content.indexOf('\n', createEstIdx);

  const tierBtnCode = `
<div onClick={()=>initTierEdit(null)} className="btn" style={{width:'100%',padding:'16px',textAlign:'center',cursor:'pointer',border:'1px dashed #a855f7',borderRadius:12,color:'#a855f7',fontWeight:600,fontSize:14,marginTop:8,background:'transparent'}}>\\u{1F4CB} Create Tiered Proposal</div>`;

  content = content.substring(0, createEstLineEnd) + '\n' + tierBtnCode + content.substring(createEstLineEnd);
  console.log('[add-tiered-proposals] STEP 2: Added Create Tiered Proposal button.');
}


// — STEP 3: Add saved tier proposals display + customer card view —
// Insert after the "Request Signature" button area, before Inventory/Price Book buttons

const reqSigAnchor = 'Request Signature';
// Find the second occurrence (first is in nav, second is in finance tab)
let reqSigIdx = content.indexOf(reqSigAnchor);
if (reqSigIdx !== -1) {
  // Find the occurrence that's near the Create Estimate button area
  const createEstPos = content.indexOf('Create Tiered Proposal');
  if (createEstPos !== -1) {
    reqSigIdx = content.indexOf(reqSigAnchor, createEstPos);
  }
}

if (reqSigIdx !== -1) {
  const reqSigLineEnd = content.indexOf('\n', reqSigIdx);

  const tierDisplayCode = `

{tierProposals.length > 0 && <div style={{marginTop:16}}>
<div style={{fontSize:11,fontWeight:700,letterSpacing:1,color:'#94a3b8',marginBottom:8,textTransform:'uppercase'}}>Tiered Proposals</div>
{tierProposals.map(tp => <div key={tp.id} className="card" style={{padding:16,marginBottom:8,border:'1px solid #334155',borderRadius:12}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
<div style={{fontWeight:700,fontSize:15}}>{tp.name}</div>
<div style={{display:'flex',gap:6,alignItems:'center'}}>
<span className="badge" style={{background:tp.status==='sent'?'#2563eb':tp.status==='approved'?'#16a34a':'#475569',color:'#fff',padding:'2px 8px',borderRadius:8,fontSize:11,textTransform:'uppercase'}}>{tp.status}</span>
<span style={{fontSize:11,color:'#64748b'}}>{tp.created}</span>
</div>
</div>
<div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
{tp.tiers.map((t,i)=><div key={i} style={{background:t.color+'18',border:'1px solid '+t.color+'44',borderRadius:8,padding:'6px 12px',fontSize:12}}>
<span style={{color:t.color,fontWeight:600}}>{t.icon} {t.name}</span>
<span style={{color:'#94a3b8',marginLeft:6}}>{window.CURRENCY||'$'}{tierTotal(t).toFixed(2)}</span>
</div>)}
</div>
<div style={{display:'flex',gap:6}}>
<div onClick={()=>initTierEdit(tp)} className="btn btn-sm" style={{flex:1,textAlign:'center',padding:'8px 0',background:'#1e293b',borderRadius:8,cursor:'pointer',fontSize:12,color:'#e2e8f0'}}>Edit</div>
<div onClick={()=>setTierCustomerView(tp)} className="btn btn-sm" style={{flex:1,textAlign:'center',padding:'8px 0',background:'#7c3aed',borderRadius:8,cursor:'pointer',fontSize:12,color:'#fff'}}>Customer Preview</div>
<div onClick={()=>{if(confirm('Delete this tiered proposal?'))deleteTierProposal(tp.id)}} className="btn btn-sm" style={{textAlign:'center',padding:'8px 12px',background:'#1e293b',borderRadius:8,cursor:'pointer',fontSize:12,color:'#ef4444'}}>\\u2715</div>
</div>
</div>)}
</div>}

{tierCustomerView && <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.7)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={e=>{if(e.target===e.currentTarget)setTierCustomerView(null)}}>
<div style={{background:'#0f172a',borderRadius:16,padding:24,maxWidth:500,width:'100%',maxHeight:'90vh',overflow:'auto',border:'1px solid #334155'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
<div style={{fontSize:18,fontWeight:700,color:'#f1f5f9'}}>Choose Your Service Package</div>
<div onClick={()=>setTierCustomerView(null)} style={{cursor:'pointer',fontSize:20,color:'#94a3b8'}}>\\u2715</div>
</div>
<div style={{display:'flex',gap:6,marginBottom:16,borderBottom:'1px solid #1e293b',paddingBottom:8}}>
{tierCustomerView.tiers.map((t,i)=><div key={i} onClick={()=>setActiveTierProposal(i)} style={{flex:1,textAlign:'center',padding:'10px 8px',borderRadius:10,cursor:'pointer',background:activeTierProposal===i?t.color+'22':'transparent',border:activeTierProposal===i?'2px solid '+t.color:'2px solid transparent',position:'relative',transition:'all 0.2s'}}>
<div style={{fontSize:16,marginBottom:2}}>{t.icon}</div>
<div style={{fontWeight:700,fontSize:13,color:t.color}}>{t.name}</div>
{t.recommended && <div style={{position:'absolute',top:-8,right:-4,background:'#f59e0b',color:'#000',fontSize:9,fontWeight:800,padding:'1px 6px',borderRadius:8,textTransform:'uppercase'}}>Best Value</div>}
</div>)}
</div>
{tierCustomerView.tiers[activeTierProposal||0] && (() => {
const t = tierCustomerView.tiers[activeTierProposal||0];
return <div>
<div style={{color:'#94a3b8',fontSize:13,marginBottom:12,lineHeight:1.5}}>{t.description}</div>
{t.items.length > 0 && <div style={{marginBottom:12}}>
{t.items.map((it,j)=><div key={j} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #1e293b',fontSize:13}}>
<span style={{color:'#e2e8f0'}}>{it.name} {it.qty>1?'\\u00D7'+it.qty:''}</span>
<span style={{color:'#94a3b8',fontWeight:600}}>{window.CURRENCY||'$'}{((it.price||0)*(it.qty||1)).toFixed(2)}</span>
</div>)}
</div>}
<div style={{display:'flex',justifyContent:'space-between',padding:'12px 0',borderTop:'2px solid '+t.color,marginTop:4}}>
<span style={{fontWeight:700,fontSize:15,color:'#f1f5f9'}}>Total</span>
<span style={{fontWeight:700,fontSize:15,color:t.color}}>{window.CURRENCY||'$'}{tierTotal(t).toFixed(2)}</span>
</div>
{t.warranty && <div style={{marginTop:8,padding:'8px 12px',background:'#1e293b',borderRadius:8,fontSize:12,color:'#94a3b8'}}>\\u{1F6E1} {t.warranty}</div>}
{t.notes && <div style={{marginTop:6,padding:'8px 12px',background:'#1e293b',borderRadius:8,fontSize:12,color:'#94a3b8'}}>\\u{1F4DD} {t.notes}</div>}
<div onClick={()=>{setTierProposals(prev=>prev.map(p=>p.id===tierCustomerView.id?{...p,status:'approved',selectedTier:activeTierProposal||0}:p));setTierCustomerView(null)}} className="btn" style={{width:'100%',marginTop:16,padding:'14px',textAlign:'center',background:t.color,color:t.color==='#f59e0b'?'#000':'#fff',fontWeight:700,fontSize:15,borderRadius:10,cursor:'pointer'}}>Select {t.name} Package</div>
</div>;
})()}
</div>
</div>}`;

  content = content.substring(0, reqSigLineEnd) + '\n' + tierDisplayCode + content.substring(reqSigLineEnd);
  console.log('[add-tiered-proposals] STEP 3: Added tier proposals display + customer view.');
}


// — STEP 4: Add the tiered proposal editor modal —
// Insert before the closing of the component's return (find a reliable spot)
// We'll insert it right before the last occurrence of the estimate modal area

const tierModalCode = `

{showTierModal && tierEditData && <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.7)',zIndex:9998,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={e=>{if(e.target===e.currentTarget){setShowTierModal(false);setTierEditData(null)}}}>
<div style={{background:'#0f172a',borderRadius:16,padding:0,maxWidth:700,width:'100%',maxHeight:'90vh',overflow:'auto',border:'1px solid #334155'}}>
<div style={{padding:'20px 24px',borderBottom:'1px solid #1e293b',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<div style={{fontSize:18,fontWeight:700,color:'#f1f5f9'}}>{tierEditData.id && tierProposals.find(p=>p.id===tierEditData.id) ? 'Edit' : 'Create'} Tiered Proposal</div>
<div onClick={()=>{setShowTierModal(false);setTierEditData(null)}} style={{cursor:'pointer',fontSize:22,color:'#94a3b8',lineHeight:1}}>\\u2715</div>
</div>

<div style={{padding:'16px 24px'}}>
<div style={{marginBottom:12}}>
<div style={{fontSize:11,fontWeight:700,letterSpacing:1,color:'#64748b',marginBottom:4,textTransform:'uppercase'}}>Proposal Name</div>
<input className="inp" value={tierEditData.name} onChange={e=>setTierEditData({...tierEditData, name:e.target.value})} style={{width:'100%',padding:'10px 12px',background:'#1e293b',border:'1px solid #334155',borderRadius:8,color:'#f1f5f9',fontSize:14}} />
</div>

<div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
{tierEditData.tiers.map((t,i)=><div key={i} onClick={()=>setTierEditData({...tierEditData,activeTierIdx:i})} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:10,cursor:'pointer',background:tierEditData.activeTierIdx===i?t.color+'22':'#1e293b',border:tierEditData.activeTierIdx===i?'2px solid '+t.color:'2px solid #334155',transition:'all 0.2s'}}>
<span style={{fontSize:14}}>{t.icon}</span>
<span style={{fontWeight:600,fontSize:13,color:tierEditData.activeTierIdx===i?t.color:'#94a3b8'}}>{t.name}</span>
</div>)}
{tierEditData.tiers.length < 5 && <div onClick={addTierToProposal} style={{padding:'8px 14px',borderRadius:10,cursor:'pointer',border:'2px dashed #334155',fontSize:13,color:'#64748b'}}>+ Add Tier</div>}
</div>

{(() => {
const ti = tierEditData.activeTierIdx;
const tier = tierEditData.tiers[ti];
if (!tier) return null;
return <div style={{border:'1px solid #334155',borderRadius:12,padding:16,background:'#0f172a'}}>
<div style={{display:'flex',gap:8,marginBottom:12}}>
<div style={{flex:1}}>
<div style={{fontSize:11,fontWeight:700,letterSpacing:1,color:'#64748b',marginBottom:4,textTransform:'uppercase'}}>Tier Name</div>
<input className="inp" value={tier.name} onChange={e=>updateTierField(ti,'name',e.target.value)} style={{width:'100%',padding:'8px 10px',background:'#1e293b',border:'1px solid #334155',borderRadius:6,color:'#f1f5f9',fontSize:13}} />
</div>
<div style={{width:80}}>
<div style={{fontSize:11,fontWeight:700,letterSpacing:1,color:'#64748b',marginBottom:4,textTransform:'uppercase'}}>Color</div>
<input type="color" value={tier.color} onChange={e=>updateTierField(ti,'color',e.target.value)} style={{width:'100%',height:35,padding:2,background:'#1e293b',border:'1px solid #334155',borderRadius:6,cursor:'pointer'}} />
</div>
{tierEditData.tiers.length > 2 && <div style={{display:'flex',alignItems:'flex-end',paddingBottom:2}}>
<div onClick={()=>removeTierFromProposal(ti)} style={{padding:'8px 10px',background:'#1e293b',borderRadius:6,cursor:'pointer',color:'#ef4444',fontSize:12}}>\\u2715</div>
</div>}
</div>

<div style={{marginBottom:10}}>
<div style={{fontSize:11,fontWeight:700,letterSpacing:1,color:'#64748b',marginBottom:4,textTransform:'uppercase'}}>Description</div>
<textarea className="inp" value={tier.description} onChange={e=>updateTierField(ti,'description',e.target.value)} rows={2} style={{width:'100%',padding:'8px 10px',background:'#1e293b',border:'1px solid #334155',borderRadius:6,color:'#f1f5f9',fontSize:13,resize:'vertical'}} />
</div>

<div style={{display:'flex',gap:8,marginBottom:10}}>
<div style={{flex:1}}>
<div style={{fontSize:11,fontWeight:700,letterSpacing:1,color:'#64748b',marginBottom:4,textTransform:'uppercase'}}>Warranty</div>
<input className="inp" value={tier.warranty} onChange={e=>updateTierField(ti,'warranty',e.target.value)} style={{width:'100%',padding:'8px 10px',background:'#1e293b',border:'1px solid #334155',borderRadius:6,color:'#f1f5f9',fontSize:13}} />
</div>
<div style={{flex:1}}>
<div style={{fontSize:11,fontWeight:700,letterSpacing:1,color:'#64748b',marginBottom:4,textTransform:'uppercase'}}>Notes</div>
<input className="inp" value={tier.notes} onChange={e=>updateTierField(ti,'notes',e.target.value)} style={{width:'100%',padding:'8px 10px',background:'#1e293b',border:'1px solid #334155',borderRadius:6,color:'#f1f5f9',fontSize:13}} />
</div>
</div>

<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
<input type="checkbox" checked={!!tier.recommended} onChange={e=>updateTierField(ti,'recommended',e.target.checked)} style={{accentColor:tier.color}} />
<span style={{fontSize:12,color:'#94a3b8'}}>Mark as recommended (Best Value)</span>
</div>

<div style={{fontSize:11,fontWeight:700,letterSpacing:1,color:'#64748b',marginBottom:6,marginTop:10,textTransform:'uppercase'}}>Line Items</div>
{tier.items.length===0 && <div style={{textAlign:'center',padding:'16px',color:'#475569',fontSize:13}}>No items yet. Add from inventory or enter manually.</div>}
{tier.items.map((it,j) => <div key={j} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0',borderBottom:'1px solid #1e293b'}}>
<div style={{flex:1,fontSize:13,color:'#e2e8f0'}}>{it.name}</div>
<div style={{display:'flex',alignItems:'center',gap:4}}>
<div onClick={()=>updateTierItemQty(ti,j,(it.qty||1)-1)} style={{width:24,height:24,display:'flex',alignItems:'center',justifyContent:'center',background:'#1e293b',borderRadius:4,cursor:'pointer',color:'#94a3b8',fontSize:14}}>-</div>
<span style={{fontSize:13,color:'#e2e8f0',minWidth:20,textAlign:'center'}}>{it.qty||1}</span>
<div onClick={()=>updateTierItemQty(ti,j,(it.qty||1)+1)} style={{width:24,height:24,display:'flex',alignItems:'center',justifyContent:'center',background:'#1e293b',borderRadius:4,cursor:'pointer',color:'#94a3b8',fontSize:14}}>+</div>
</div>
<div style={{fontSize:13,color:'#94a3b8',minWidth:60,textAlign:'right'}}>{window.CURRENCY||'$'}{((it.price||0)*(it.qty||1)).toFixed(2)}</div>
<div onClick={()=>removeItemFromTier(ti,j)} style={{cursor:'pointer',color:'#ef4444',fontSize:14}}>\\u2715</div>
</div>)}

<div style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderTop:'1px solid #334155',marginTop:6}}>
<span style={{fontWeight:700,fontSize:14,color:'#f1f5f9'}}>Tier Total</span>
<span style={{fontWeight:700,fontSize:14,color:tier.color}}>{window.CURRENCY||'$'}{tierTotal(tier).toFixed(2)}</span>
</div>

{!tierActivePicker && <div style={{display:'flex',gap:6,marginTop:8}}>
<div onClick={()=>setTierActivePicker('manual')} className="btn btn-sm" style={{flex:1,textAlign:'center',padding:'10px',background:'#1e293b',border:'1px solid #334155',borderRadius:8,cursor:'pointer',fontSize:12,color:'#e2e8f0'}}>+ Add Manual Item</div>
<div onClick={()=>setTierActivePicker('inventory')} className="btn btn-sm" style={{flex:1,textAlign:'center',padding:'10px',background:'#1e293b',border:'1px solid #334155',borderRadius:8,cursor:'pointer',fontSize:12,color:'#e2e8f0'}}>\\uD83D\\uDCE6 From Inventory</div>
</div>}

{tierActivePicker==='manual' && <div style={{marginTop:8,padding:12,background:'#1e293b',borderRadius:8,border:'1px solid #334155'}}>
<div style={{fontSize:11,fontWeight:700,color:'#64748b',marginBottom:6,textTransform:'uppercase'}}>Add Manual Item</div>
<div style={{display:'flex',gap:6}}>
<input id="tier-item-name" className="inp" placeholder="Item name" style={{flex:2,padding:'8px',background:'#0f172a',border:'1px solid #334155',borderRadius:6,color:'#f1f5f9',fontSize:13}} />
<input id="tier-item-price" className="inp" type="number" placeholder="Price" style={{flex:1,padding:'8px',background:'#0f172a',border:'1px solid #334155',borderRadius:6,color:'#f1f5f9',fontSize:13}} />
<div onClick={()=>{
const nameEl=document.getElementById('tier-item-name');
const priceEl=document.getElementById('tier-item-price');
if(nameEl&&nameEl.value){addItemToTier(ti,{name:nameEl.value,price:parseFloat(priceEl?.value)||0,qty:1});nameEl.value='';if(priceEl)priceEl.value=''}
}} className="btn" style={{padding:'8px 14px',background:'#7c3aed',borderRadius:6,cursor:'pointer',color:'#fff',fontSize:12,fontWeight:600}}>Add</div>
</div>
<div onClick={()=>setTierActivePicker(null)} style={{textAlign:'center',marginTop:6,fontSize:11,color:'#64748b',cursor:'pointer'}}>Cancel</div>
</div>}

{tierActivePicker==='inventory' && <div style={{marginTop:8,padding:12,background:'#1e293b',borderRadius:8,border:'1px solid #334155'}}>
<div style={{fontSize:11,fontWeight:700,color:'#64748b',marginBottom:6,textTransform:'uppercase'}}>Add from Inventory</div>
<input className="inp" placeholder="Search inventory..." value={tierPickerSearch} onChange={e=>setTierPickerSearch(e.target.value)} style={{width:'100%',padding:'8px',background:'#0f172a',border:'1px solid #334155',borderRadius:6,color:'#f1f5f9',fontSize:13,marginBottom:6}} />
<div style={{maxHeight:150,overflow:'auto'}}>
{(window.__inventoryItems||[
{name:'Basic Filter',price:15},{name:'Premium Filter',price:35},{name:'Capacitor',price:45},{name:'Thermostat',price:85},
{name:'Blower Motor',price:250},{name:'Compressor',price:800},{name:'Condenser Coil',price:450},{name:'Evaporator Coil',price:550},
{name:'Refrigerant (per lb)',price:75},{name:'Ductwork Section',price:120},{name:'UV Light System',price:350},{name:'Smart Thermostat',price:200}
]).filter(x=>!tierPickerSearch||x.name.toLowerCase().includes(tierPickerSearch.toLowerCase())).map((inv,k)=>
<div key={k} onClick={()=>addItemToTier(ti,{name:inv.name,price:inv.price,qty:1})} style={{display:'flex',justifyContent:'space-between',padding:'8px',cursor:'pointer',borderRadius:6,fontSize:13,color:'#e2e8f0',borderBottom:'1px solid #0f172a'}} onMouseOver={e=>e.currentTarget.style.background='#334155'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
<span>{inv.name}</span><span style={{color:'#94a3b8'}}>{window.CURRENCY||'$'}{inv.price.toFixed(2)}</span>
</div>)}
</div>
<div onClick={()=>{setTierActivePicker(null);setTierPickerSearch('')}} style={{textAlign:'center',marginTop:6,fontSize:11,color:'#64748b',cursor:'pointer'}}>Close</div>
</div>}

</div>;
})()}
</div>

<div style={{padding:'16px 24px',borderTop:'1px solid #1e293b',display:'flex',gap:8,justifyContent:'flex-end'}}>
<div onClick={()=>{setShowTierModal(false);setTierEditData(null)}} className="btn" style={{padding:'10px 20px',background:'#1e293b',borderRadius:8,cursor:'pointer',fontSize:13,color:'#94a3b8'}}>Cancel</div>
<div onClick={saveTierProposal} className="btn" style={{padding:'10px 20px',background:'#7c3aed',borderRadius:8,cursor:'pointer',fontSize:13,color:'#fff',fontWeight:600}}>Save Proposal</div>
</div>
</div>
</div>}`;

// Insert the tier modal right before the estimate modal (the "Add Estimate" heading)
const addEstimateAnchor = 'Add Estimate';
// Find the div/heading containing "Add Estimate" - it should be the modal overlay
// We need to find the modal container start. Look for the expandEst conditional rendering.
const expandEstRenderIdx = content.indexOf('expandEst', content.indexOf('expandEst') + 1);
if (expandEstRenderIdx !== -1) {
  // Go back to find the start of this line
  const lineStart = content.lastIndexOf('\n', expandEstRenderIdx);
  content = content.substring(0, lineStart) + '\n' + tierModalCode + '\n' + content.substring(lineStart);
  console.log('[add-tiered-proposals] STEP 4: Added tier modal component.');
} else {
  console.log('[add-tiered-proposals] Could not find expandEst render location. Skipping step 4.');
}


// — STEP 5: Write the modified file —

if (content !== original) {
  writeFileSync(file, content, 'utf8');
  console.log('[add-tiered-proposals] Done! File written successfully.');
} else {
  console.log('[add-tiered-proposals] No changes made.');
}
