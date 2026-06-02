# V2 鎻掍欢寮€鍙戞寚鍗?
鏈枃鏄紑鍙戞垨杩佺Щ MoviePilot V2 鎻掍欢鏃剁殑涓绘枃妗ｃ€傚紑濮嬬紪鐮佸墠鍏堢‘璁ら渶姹傘€佺洰鏍囨彃浠剁洰褰曘€佸競鍦哄厓鏁版嵁鍜屽彲楠岃瘉鏂瑰紡銆?
## 鏂板鎻掍欢鏈€灏忕粨鏋?
```text
plugins.v2/<plugin_id>/
鈹斺攢鈹€ __init__.py
```

`__init__.py` 涓畾涔夋彃浠朵富绫伙紝骞剁户鎵?MoviePilot 鎻愪緵鐨?`_PluginBase`锛?
```python
from app.plugins import _PluginBase


class ExamplePlugin(_PluginBase):
    plugin_name = "绀轰緥鎻掍欢"
    plugin_desc = "璇存槑鎻掍欢鐢ㄩ€?
    plugin_icon = "example.png"
    plugin_version = "1.0"
    plugin_author = "author"
    plugin_config_prefix = "example_"
    plugin_order = 99
    auth_level = 1
```

瀛楁寤鸿锛?
- `plugin_name`銆乣plugin_desc` 闈㈠悜鐢ㄦ埛灞曠ず锛屼繚鎸佺畝娲併€?- `plugin_icon` 浼樺厛寮曠敤 `icons/` 涓殑鏂囦欢鍚嶃€?- `plugin_version` 涓?`package.v2.json` 涓増鏈悓姝ャ€?- `plugin_config_prefix` 浣跨敤鎻掍欢 ID 鍔犱笅鍒掔嚎锛岄伩鍏嶄笌鍏朵粬鎻掍欢鍐茬獊銆?- `plugin_order` 鍙湪鏈夋槑纭帓搴忛渶姹傛椂璋冩暣銆?- `auth_level` 涓庢彃浠堕闄╁拰鐩爣鐢ㄦ埛绾у埆鍖归厤銆?
## 鐢熷懡鍛ㄦ湡鏂规硶

甯哥敤鏂规硶濡備笅锛?
- `init_plugin(self, config: dict = None)`锛氳鍙栭厤缃€佸垵濮嬪寲鐘舵€併€佹敞鍐屾湇鍔℃垨瀹氭椂浠诲姟銆?- `get_state(self) -> bool`锛氳繑鍥炴彃浠跺綋鍓嶅惎鐢ㄧ姸鎬併€?- `get_form(self)`锛氳繑鍥為厤缃〉 schema 鍜岄粯璁ゆ暟鎹€?- `get_page(self)`锛氳繑鍥炴彃浠惰鎯呴〉鎴栨暟鎹〉 schema锛涗笉鐢ㄦ椂鍙繑鍥炵┖鍒楄〃鎴?`pass`銆?- `get_command()`锛氭敞鍐屽懡浠わ紱涓嶇敤鏃跺彲杩斿洖绌哄垪琛ㄣ€?- `get_api(self)`锛氭敞鍐屾彃浠?API锛涗笉鐢ㄦ椂鍙繑鍥炵┖鍒楄〃銆?- `stop_service(self)`锛氬仠姝㈡湇鍔°€侀噴鏀捐祫婧愩€佸彇娑堝悗鍙颁换鍔°€?
瀹炵幇鍘熷垯锛?
- `init_plugin()` 蹇呴』鑳借閲嶅璋冪敤锛岄厤缃彉鏇存椂涓嶅簲鐣欎笅閲嶅娉ㄥ唽鐨勪换鍔°€佹ā鍧楁垨浜嬩欢鍓綔鐢ㄣ€?- 寮€鍚姸鎬併€佸繀瑕侀厤缃拰澶栭儴渚濊禆瑕佸垎鍒垽鏂紱缂哄皯蹇呰閰嶇疆鏃跺簲绂佺敤鍔熻兘骞惰褰曟棩蹇椼€?- 鏈夊悗鍙颁换鍔°€佹ā鍧楁敞鍐屻€侀暱杩炴帴鎴栫嚎绋嬫椂锛屽繀椤诲湪 `stop_service()` 鎴栫鐢ㄥ垎鏀腑娓呯悊銆?
## 閰嶇疆璇诲彇涓庝繚瀛?
鎻掍欢閰嶇疆鐢?`init_plugin(config)` 鎺ユ敹銆傚缓璁妸澶栭儴閰嶇疆鍚屾鍒扮鏈夊睘鎬э細

```python
def init_plugin(self, config: dict = None):
    if config:
        self._enabled = config.get("enabled", False)
        self._token = config.get("token")
```

闇€瑕佽嚜鍔ㄥ浣嶄竴娆℃€у紑鍏虫椂锛屼娇鐢?`_PluginBase` 鎻愪緵鐨勯厤缃洿鏂拌兘鍔涳紝渚嬪褰撳墠 `mediaopenlistupload` 鐨勬祴璇曟秷鎭紑鍏充細鍦ㄥ彂閫佸悗璋冪敤 `update_config()` 鍐欏洖銆?
涓嶈鍦ㄦ棩蹇椾腑杈撳嚭 Token銆丆ookie銆佸瘑閽ユ垨瀹屾暣璁よ瘉澶淬€?
## 缁撴瀯鍖栭厤缃〉

绠€鍗曢厤缃〉浼樺厛浣跨敤 `get_form()` 杩斿洖 MoviePilot 鏀寔鐨?Vuetify schema銆傚綋鍓嶄粨搴撴牱渚嬩娇鐢ㄧ殑缁勪欢鍖呮嫭锛?
- `VForm`
- `VRow`
- `VCol`
- `VSwitch`
- `VTextField`
- `VSelect`
- `VAlert`

`get_form()` 杩斿洖鍊奸€氬父鏄細

```python
return [schema], {
    "enabled": False,
}
```

琛ㄥ崟涓殑 `props.model` 蹇呴』涓庨粯璁ゆ暟鎹拰 `init_plugin(config)` 璇诲彇鐨?key 瀵归綈銆?
## 娓叉煋妯″紡

浼樺厛浣跨敤鍐呯疆 schema 娓叉煋閰嶇疆椤碉紝閫傚悎寮€鍏炽€佹枃鏈銆佷笅鎷夋銆佹彁绀轰俊鎭瓑甯歌鍦烘櫙銆?
褰撴彃浠堕渶瑕佸鏉備氦浜掋€佸浘琛ㄣ€佹壒閲忔搷浣滄垨楂樺害瀹氬埗椤甸潰鏃讹紝鍐嶈€冭檻杩滅▼ Vue 缁勪欢銆備娇鐢ㄨ繙绋嬬粍浠跺墠闇€瑕侀槄璇?MoviePilot-Frontend 鐨勬ā鍧楄仈閭︽寚鍗楋紝骞舵槑纭細

- 缁勪欢鏋勫缓鍜屽彂甯冧綅缃€?- 鍚庣 `get_api()` 鎴栧叾浠栨帴鍙ｅ浣曚緵鍓嶇璋冪敤銆?- 缁勪欢鍔犺浇澶辫触鏃舵槸鍚︽湁鍩虹 schema 闄嶇骇銆?
涓嶈涓轰簡绠€鍗曡〃鍗曞紩鍏ヨ繙绋嬬粍浠躲€?
## 浜嬩欢澶勭悊

鎻掍欢鍙€氳繃 MoviePilot 浜嬩欢绯荤粺璁㈤槄瀹夸富浜嬩欢銆傚綋鍓嶆牱渚嬩娇鐢細

```python
from app.core.event import eventmanager, Event
from app.schemas.types import EventType


@eventmanager.register(EventType.NoticeMessage)
def send(self, event: Event):
    ...
```

浜嬩欢澶勭悊寤鸿锛?
- 鍏堟鏌ユ彃浠跺惎鐢ㄧ姸鎬佸拰蹇呰閰嶇疆銆?- 瀵?`event.event_data` 鍋氱┖鍊煎拰绫诲瀷鍏煎澶勭悊銆?- 澶栭儴璇锋眰鍖呰９寮傚父澶勭悊锛屽け璐ユ椂璁板綍鍙畾浣嶄絾涓嶆硠瀵嗙殑鏃ュ織銆?- 閬垮厤鍦ㄤ簨浠跺洖璋冧腑鎵ц涓嶅彲鎺х殑闀胯€楁椂闃诲浠诲姟銆?
## 鎻掍欢 API

闇€瑕佺粰鍓嶇杩滅▼缁勪欢鎴栧閮ㄨ皟鐢ㄦ彁渚涙帴鍙ｆ椂锛屽疄鐜?`get_api()`銆侫PI 鐨勮璁″簲灏介噺灏忚€岀ǔ瀹氾細

- 璺緞鍛藉悕涓庢彃浠?ID 鐩稿叧銆?- 鏂规硶鍜屽弬鏁版槑纭€?- 杩斿洖缁撴瀯绋冲畾銆?- 鏍￠獙鐢ㄦ埛杈撳叆銆?- 涓嶆毚闇叉晱鎰熼厤缃€?
涓嶇敤 API 鏃惰繑鍥炵┖鍒楄〃锛屼笉瑕佺暀涓嬪崐瀹炵幇鐨勬帴鍙ｃ€?
## 瀛愭ā鍧楀拰鍒嗚韩鍏煎

褰撳墠 `mediaopenlistupload` V2 鏍蜂緥涓轰簡鏀寔鎻掍欢鍒嗚韩锛屼娇鐢ㄨ繍琛屾椂绫诲悕鍜屾ā鍧楄矾寰勭敓鎴愰厤缃墠缂€鍜屽姞杞藉瓙妯″潡銆傚紑鍙戞柊鎻掍欢鏃舵敞鎰忥細

- 澶氬疄渚嬩細鏀瑰彉绫诲悕鎴栨ā鍧楄矾寰勬椂锛屼笉瑕佺‖缂栫爜鍘熷鍛藉悕绌洪棿鍔犺浇瀛愭ā鍧椼€?- 澶氫釜瀹炰緥涓嶅簲鍏变韩鍙彉鍗曚緥鐘舵€侊紝渚嬪鍙戦€佸櫒 URL銆佺洰鏍囪处鍙枫€佸悗鍙扮嚎绋嬬瓑銆?- 娉ㄥ唽鍒板涓荤鐞嗗櫒鐨勬ā鍧楄鑳芥寜褰撳墠瀹炰緥鍗歌浇銆?
## 鍏冩暟鎹悓姝?
鏂板鎴栧彂甯?V2 鎻掍欢鏃跺悓姝ョ淮鎶わ細

- `plugins.v2/<plugin_id>/__init__.py` 涓殑鎻掍欢绫诲厓鏁版嵁銆?- `package.v2.json` 涓悓 ID 鑺傜偣銆?- `icons/` 涓紩鐢ㄧ殑鍥炬爣鏂囦欢銆?- 蹇呰鏃惰ˉ鍏?`assets/` 涓殑璇存槑鍥俱€?
鐗堟湰鍗囩骇鏃舵洿鏂?`plugin_version`銆乣package.v2.json` 鐨?`version` 鍜?`history`銆?
## 鏍￠獙寤鸿

鏀规簮鐮佸悗鑷冲皯杩愯锛?
```powershell
git diff --check
python -m py_compile plugins.v2\<plugin_id>\__init__.py
```

濡傛灉鎻掍欢鏈夊瓙妯″潡锛屼篃瀵圭浉鍏?`.py` 鏂囦欢鎵ц `py_compile`銆傜敱浜庢湰浠撳簱涓嶅寘鍚?MoviePilot 涓荤▼搴忎緷璧栵紝鐩存帴瀵煎叆杩愯鎻掍欢鍙兘澶辫触锛涜繖绉嶆儏鍐靛簲鍦ㄦ渶缁堝洖澶嶄腑璇存槑闄愬埗銆?
## 甯歌椋庨櫓

- `package.v2.json` 鐗堟湰涓庢彃浠剁被鐗堟湰涓嶄竴鑷淬€?- 琛ㄥ崟 `model` 涓庨厤缃?key 涓嶄竴鑷达紝瀵艰嚧閰嶇疆鏃犳硶淇濆瓨鎴栬鍙栥€?- 鍚庡彴浠诲姟閲嶅娉ㄥ唽锛岄厤缃垏鎹㈠悗閲嶅鎵ц銆?- 绂佺敤鎻掍欢鏃舵湭閲婃斁绾跨▼銆佹ā鍧椼€佸畾鏃跺櫒鎴栬繛鎺ャ€?- 鏃ュ織娉勯湶 Token銆丆ookie銆佽闂湴鍧€涓殑鏁忔劅鍙傛暟銆?- 寮曠敤浜嗕富浠撳簱鎴栧墠绔粨搴撴湭纭瀛樺湪鐨勬帴鍙ｃ€?
