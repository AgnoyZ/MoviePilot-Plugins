# 甯歌闂绱㈠紩

鏈〉鎸夊紑鍙戝満鏅暣鐞嗗父瑙侀棶棰樸€備慨鏀规彃浠跺墠浼樺厛闃呰 `docs/Repository_Guide.md` 鍜?`docs/V2_Plugin_Development.md`銆?
## 鎴戝簲璇ユ妸鏂版彃浠舵斁鍦ㄥ摢閲岋紵

榛樿鏀惧湪 `plugins.v2/<plugin_id>/`銆傚彧鏈夊湪浠诲姟鏄庣‘瑕佹眰缁存姢鏃х増鎻掍欢鏃讹紝鎵嶄慨鏀?`plugins/`銆?
## 鎻掍欢 ID銆佺被鍚嶅拰鍏冩暟鎹?key 鎬庝箞鍛藉悕锛?
鐩綍鍚嶅拰 `package.v2.json` 鐨?key 浣跨敤绋冲畾鐨勫皬鍐欒嫳鏂?ID锛屼緥濡?`mediaopenlistupload`銆傛彃浠朵富绫讳娇鐢?Python 绫诲悕椋庢牸锛屼緥濡?`MediaOpenListUpload`銆俙plugin_config_prefix` 寤鸿浣跨敤鎻掍欢 ID 鍔犱笅鍒掔嚎锛屼緥濡?`mediaopenlistupload_`銆?
## 鏂板鎻掍欢蹇呴』鏀瑰摢浜涙枃浠讹紵

閫氬父闇€瑕侊細

- `plugins.v2/<plugin_id>/__init__.py`
- `package.v2.json`
- `icons/<icon_file>`锛屽鏋滀娇鐢ㄦ湰鍦板浘鏍?- `assets/<asset_file>`锛屽鏋滄枃妗ｆ垨閰嶇疆椤甸渶瑕佽鏄庡浘

涓嶈淇敼鏃犲叧鎻掍欢鑺傜偣銆?
## V1 鍜?V2 閮借鍚屾鍚楋紵

涓嶉粯璁ゅ悓姝ャ€傚綋鍓嶅紑鍙戜紭鍏?V2銆傚彧鏈夌敤鎴锋槑纭姹傚吋瀹?V1锛屾垨宸叉湁鍙戝竷绛栫暐瑕佹眰鍚屾椂缁存姢鏃讹紝鎵嶄慨鏀?`plugins/` 鍜?`package.json`銆?
## 閰嶇疆椤电敤 `get_form()` 杩樻槸杩滅▼ Vue 缁勪欢锛?
绠€鍗曢厤缃〉鐢?`get_form()`銆傚彧鏈夊鏉備氦浜掋€佸浘琛ㄣ€佹壒閲忔搷浣滄垨鑷畾涔夐〉闈㈡棤娉曠敤 schema 琛ㄨ揪鏃讹紝鎵嶄娇鐢ㄨ繙绋?Vue 缁勪欢锛屽苟闃呰 MoviePilot-Frontend 妯″潡鑱旈偊鎸囧崡銆?
## 琛ㄥ崟淇濆瓨鍚庤鍙栦笉鍒伴厤缃€庝箞鍔烇紵

妫€鏌ヤ笁澶勬槸鍚︿竴鑷达細

- `get_form()` 涓殑 `props.model`
- `get_form()` 杩斿洖鐨勯粯璁ゆ暟鎹?key
- `init_plugin(config)` 涓鍙栫殑 key

涓夎€呬笉涓€鑷翠細瀵艰嚧閰嶇疆淇濆瓨銆佸洖鏄炬垨杩愯鐘舵€佸紓甯搞€?
## 鎻掍欢鐘舵€佸簲璇ユ€庝箞鍒ゆ柇锛?
`get_state()` 涓嶅彧鐪?`enabled`锛岃繕搴旂‘璁ゅ繀瑕侀厤缃槸鍚﹀瓨鍦ㄣ€備緥濡傞渶瑕?URL 鍜岃处鍙风殑鎻掍欢锛屽簲鍚屾椂鍒ゆ柇 URL銆佽处鍙峰拰鍚敤寮€鍏炽€?
## 浠€涔堟椂鍊欏疄鐜?`stop_service()`锛?
鍙鎻掍欢鍒涘缓浜嗗悗鍙扮嚎绋嬨€佸畾鏃朵换鍔°€侀暱杩炴帴銆佹敞鍐屾ā鍧楁垨澶栭儴璧勬簮锛屽氨闇€瑕佸湪 `stop_service()` 涓竻鐞嗐€傞厤缃彉鏇村鑷寸鐢ㄦ椂锛屼篃瑕佺‘淇濆悓鏍疯兘娓呯悊銆?
## 鑳戒笉鑳藉湪鏃ュ織閲屾墦鍗伴厤缃紵

涓嶈鎵撳嵃 Token銆丆ookie銆佽瘉涔︺€佸瘑閽ャ€佸畬鏁磋璇佸ご鎴栨晱鎰?URL 鍙傛暟銆傞渶瑕佹帓鏌ユ椂鍙墦鍗板竷灏旂姸鎬併€佸瓧娈垫槸鍚﹀瓨鍦ㄣ€佺姸鎬佺爜鍜岃劚鏁忓悗鐨勫畾浣嶄俊鎭€?
## 涓轰粈涔堜笉鐩存帴杩愯鎻掍欢鍋氬畬鏁存祴璇曪紵

鏈粨搴撲笉鍖呭惈 MoviePilot 涓荤▼搴忎緷璧栵紝鎻掍欢瀵煎叆鐨?`app.*` 鍖呴€氬父鏉ヨ嚜瀹夸富鐜銆傚洜姝ゆ湰浠撳簱鍐呴€傚悎鍋氳娉曠紪璇戙€乨iff 绌虹櫧妫€鏌ュ拰閽堝绾嚱鏁扮殑灞€閮ㄦ祴璇曪紱瀹屾暣杩愯闇€瑕佹斁鍒?MoviePilot 鐜涓獙璇併€?
## 鏀瑰畬婧愮爜鑷冲皯楠岃瘉浠€涔堬紵

寤鸿杩愯锛?
```powershell
git diff --check
python -m py_compile plugins.v2\<plugin_id>\__init__.py
```

濡傛灉淇敼浜嗗涓?Python 鏂囦欢锛屽姣忎釜鐩稿叧鏂囦欢鎵ц `py_compile`銆傛棤娉曡繍琛屽畬鏁村涓绘祴璇曟椂锛屽湪鏈€缁堣鏄庝腑鍐欐竻鍘熷洜銆?
## 鍏冩暟鎹増鏈€庝箞鏇存柊锛?
鍙戝竷鎴栧姛鑳藉彉鏇存椂鍚屾锛?
- 鎻掍欢绫?`plugin_version`
- `package.v2.json` 鐨?`version`
- `package.v2.json` 鐨?`history`

鍘嗗彶璇存槑鍐欐竻鐢ㄦ埛鍙劅鐭ュ彉鍖栵紝涓嶈鍙啓鈥滀紭鍖栤€濄€?
## 澶栭儴鏂囨。鍦ㄥ摢閲岋紵

- MoviePilot-Frontend 妯″潡鑱旈偊鎸囧崡锛歨ttps://github.com/jxxghp/MoviePilot-Frontend/blob/v2/docs/module-federation-guide.md
- MoviePilot 瀹樻柟鎻掍欢浠撳簱鏂囨。鍙敤浜庡鐓э紝浣嗗綋鍓嶄粨搴撴枃妗ｅ簲浠ユ湰浠撳簱瀹為檯鐩綍鍜屽凡纭鍛戒护涓哄噯銆?
