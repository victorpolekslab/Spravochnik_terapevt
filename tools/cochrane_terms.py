"""Словарь препаратов и методов для ссылок на Cochrane: ru (МНН/метод) → en (поисковый термин) + шаблон поиска в тексте КР.
python3 -I cochrane_terms.py <data/brief/kr> <out.json>"""
import json, glob, os, re, sys, collections

# [русское название (как показывать), английский термин для PubMed, необязательный свой regex]
DRUGS = [
 # сердечно-сосудистые
 ["ацетилсалициловая кислота", "aspirin", r"ацетилсалицилов\w*\s+кислот\w*|\bАСК\b"],
 ["клопидогрел", "clopidogrel"], ["тикагрелор", "ticagrelor"], ["прасугрел", "prasugrel"],
 ["варфарин", "warfarin"], ["апиксабан", "apixaban"], ["ривароксабан", "rivaroxaban"], ["эдоксабан", "edoxaban"],
 ["дабигатрана этексилат", "dabigatran", r"дабигатран\w*(?:\s+этексилат\w*)?"],
 ["эноксапарин натрия", "enoxaparin", r"эноксапарин\w*(?:\s+натрия)?"], ["гепарин натрия", "unfractionated heparin", r"(?<!\w)гепарин\w*\s+натрия"],
 ["фондапаринукс натрия", "fondaparinux", r"фондапаринукс\w*(?:\s+натрия)?"],
 ["эналаприл", "enalapril"], ["лизиноприл", "lisinopril"], ["периндоприл", "perindopril"], ["рамиприл", "ramipril"], ["каптоприл", "captopril"],
 ["лозартан", "losartan"], ["валсартан", "valsartan", r"валсартан\w*(?![\w+])(?!\s*\+)"], ["кандесартан", "candesartan"], ["телмисартан", "telmisartan"],
 ["валсартан+сакубитрил", "sacubitril valsartan", r"валсартан\w*\s*\+\s*сакубитрил\w*|сакубитрил\w*"],
 ["амлодипин", "amlodipine"], ["нифедипин", "nifedipine"], ["верапамил", "verapamil"], ["дилтиазем", "diltiazem"],
 ["бисопролол", "bisoprolol"], ["метопролол", "metoprolol"], ["карведилол", "carvedilol"], ["небиволол", "nebivolol"], ["атенолол", "atenolol"], ["пропранолол", "propranolol"],
 ["гидрохлоротиазид", "hydrochlorothiazide"], ["индапамид", "indapamide"], ["хлорталидон", "chlorthalidone"],
 ["фуросемид", "furosemide"], ["торасемид", "torasemide"], ["спиронолактон", "spironolactone"], ["эплеренон", "eplerenone"],
 ["моксонидин", "moxonidine"], ["ивабрадин", "ivabradine"], ["дигоксин", "digoxin"], ["амиодарон", "amiodarone"], ["соталол", "sotalol"], ["пропафенон", "propafenone"],
 ["нитроглицерин", "nitroglycerin"], ["изосорбида мононитрат", "isosorbide mononitrate", r"изосорбид\w*\s+мононитрат\w*"], ["ранолазин", "ranolazine"], ["триметазидин", "trimetazidine"], ["никорандил", "nicorandil"],
 ["железа карбоксимальтозат", "ferric carboxymaltose", r"желез\w*\s+карбоксимальтозат\w*"],
 # липиды
 ["аторвастатин", "atorvastatin"], ["розувастатин", "rosuvastatin"], ["симвастатин", "simvastatin"], ["эзетимиб", "ezetimibe"],
 ["алирокумаб", "alirocumab"], ["эволокумаб", "evolocumab"], ["инклисиран", "inclisiran"], ["фенофибрат", "fenofibrate"], ["омега-3 полиненасыщенные жирные кислоты", "omega-3 fatty acids", r"омега-3"],
 # эндокринология
 ["метформин", "metformin"], ["гликлазид", "gliclazide"], ["глимепирид", "glimepiride"], ["глибенкламид", "glibenclamide"],
 ["ситаглиптин", "sitagliptin"], ["вилдаглиптин", "vildagliptin"], ["саксаглиптин", "saxagliptin"], ["линаглиптин", "linagliptin"],
 ["эмпаглифлозин", "empagliflozin"], ["дапаглифлозин", "dapagliflozin"], ["канаглифлозин", "canagliflozin"], ["эртуглифлозин", "ertugliflozin"],
 ["лираглутид", "liraglutide"], ["дулаглутид", "dulaglutide"], ["семаглутид", "semaglutide"], ["пиоглитазон", "pioglitazone"],
 ["инсулин гларгин", "insulin glargine", r"инсулин\w*\s+гларгин\w*"], ["инсулин деглудек", "insulin degludec", r"инсулин\w*\s+деглудек\w*"], ["инсулин детемир", "insulin detemir", r"инсулин\w*\s+детемир\w*"],
 ["колекальциферол", "vitamin D", r"колекальциферол\w*"], ["кальция карбонат", "calcium supplementation", r"кальци\w*\s+карбонат\w*"],
 # остеопороз
 ["алендроновая кислота", "alendronate", r"алендронов\w*\s+кислот\w*"], ["ризедроновая кислота", "risedronate", r"ризедронов\w*\s+кислот\w*"],
 ["ибандроновая кислота", "ibandronate", r"ибандронов\w*\s+кислот\w*"], ["золедроновая кислота", "zoledronic acid", r"золедронов\w*\s+кислот\w*"],
 ["деносумаб", "denosumab"], ["терипаратид", "teriparatide"],
 # лёгкие
 ["сальбутамол", "salbutamol"], ["ипратропия бромид", "ipratropium", r"ипратропи\w*(?:\s+бромид\w*)?"], ["тиотропия бромид", "tiotropium", r"тиотропи\w*(?:\s+бромид\w*)?"],
 ["гликопиррония бромид", "glycopyrronium", r"гликопирро\w*(?:\s+бромид\w*)?"], ["умеклидиния бромид", "umeclidinium", r"умеклидини\w*(?:\s+бромид\w*)?"], ["аклидиния бромид", "aclidinium", r"аклидини\w*(?:\s+бромид\w*)?"],
 ["формотерол", "formoterol"], ["салметерол", "salmeterol"], ["индакатерол", "indacaterol"], ["олодатерол", "olodaterol"], ["вилантерол", "vilanterol"],
 ["будесонид", "budesonide"], ["беклометазон", "beclometasone"], ["флутиказон", "fluticasone"], ["рофлумиласт", "roflumilast"], ["монтелукаст", "montelukast"],
 ["омализумаб", "omalizumab"], ["меполизумаб", "mepolizumab"], ["бенрализумаб", "benralizumab"], ["дупилумаб", "dupilumab"],
 ["ацетилцистеин", "acetylcysteine"], ["амброксол", "ambroxol"], ["карбоцистеин", "carbocisteine"],
 ["амоксициллин", "amoxicillin", r"амоксициллин\w*(?![\w+])(?!\s*\+)"], ["амоксициллин+клавулановая кислота", "amoxicillin clavulanate", r"амоксициллин\w*\s*\+\s*клавуланов\w*\s+кислот\w*|клавуланат\w*"],
 ["азитромицин", "azithromycin"], ["кларитромицин", "clarithromycin"], ["доксициклин", "doxycycline"], ["левофлоксацин", "levofloxacin"], ["моксифлоксацин", "moxifloxacin"],
 ["цефтриаксон", "ceftriaxone"], ["цефиксим", "cefixime"], ["осельтамивир", "oseltamivir"],
 ["преднизолон", "prednisolone"], ["метилпреднизолон", "methylprednisolone"], ["дексаметазон", "dexamethasone"],
 # ЖКТ и печень
 ["омепразол", "omeprazole"], ["эзомепразол", "esomeprazole"], ["пантопразол", "pantoprazole"], ["рабепразол", "rabeprazole"], ["лансопразол", "lansoprazole"],
 ["висмута трикалия дицитрат", "bismuth", r"висмут\w*(?:\s+трикалия\s+дицитрат\w*)?"], ["метронидазол", "metronidazole"], ["тетрациклин", "tetracycline"],
 ["ребамипид", "rebamipide"], ["итоприд", "itopride"], ["домперидон", "domperidone"],
 ["панкреатин", "pancreatin"], ["урсодезоксихолевая кислота", "ursodeoxycholic acid", r"урсодезоксихолев\w*\s+кислот\w*"],
 ["лактулоза", "lactulose"], ["рифаксимин", "rifaximin"], ["орнитин", "L-ornithine L-aspartate", r"\bорнитин\w*"], ["адеметионин", "S-adenosylmethionine"],
 ["пентоксифиллин", "pentoxifylline"], ["месалазин", "mesalazine"], ["азатиоприн", "azathioprine"], ["инфликсимаб", "infliximab"], ["адалимумаб", "adalimumab"], ["ведолизумаб", "vedolizumab"], ["устекинумаб", "ustekinumab"],
 # почки, неврология, прочее
 ["севеламер", "sevelamer"], ["цинакалцет", "cinacalcet"], ["эпоэтин альфа", "erythropoietin", r"эпоэтин\w*"],
 ["донепезил", "donepezil"], ["галантамин", "galantamine"], ["ривастигмин", "rivastigmine"], ["мемантин", "memantine"],
 ["алтеплаза", "alteplase"], ["сертралин", "sertraline"], ["эсциталопрам", "escitalopram"], ["прегабалин", "pregabalin"], ["габапентин", "gabapentin"], ["амитриптилин", "amitriptyline"],
 ["парацетамол", "paracetamol"], ["трамадол", "tramadol"], ["аллопуринол", "allopurinol"], ["колхицин", "colchicine"],
]
METHODS = [
 ["катетерная аблация", "catheter ablation", r"катетерн\w+\s+абл\w+|радиочастотн\w+\s+абл\w+|криоабл\w+"],
 ["кардиоверсия", "cardioversion", r"кардиоверси\w+"],
 ["чрескожное коронарное вмешательство", "percutaneous coronary intervention", r"чрескожн\w+\s+коронарн\w+\s+вмешательств\w*|\bЧКВ\b"],
 ["коронарное шунтирование", "coronary artery bypass", r"коронарн\w+\s+шунтировани\w+|\bАКШ\b"],
 ["кардиореабилитация", "cardiac rehabilitation", r"кардиореабилитаци\w+|кардиологическ\w+\s+реабилитаци\w+"],
 ["лёгочная реабилитация", "pulmonary rehabilitation", r"л[её]гочн\w+\s+реабилитаци\w+"],
 ["эрадикационная терапия H. pylori", "Helicobacter pylori eradication", r"эрадикационн\w+\s+терапи\w+"],
 ["длительная кислородотерапия", "long-term oxygen therapy", r"кислородотерапи\w+|оксигенотерапи\w+"],
 ["неинвазивная вентиляция лёгких", "noninvasive ventilation", r"неинвазивн\w+\s+вентиляци\w+|\bНИВЛ\b"],
 ["вакцинация против гриппа", "influenza vaccine", r"вакцинаци\w+\s+против\s+гриппа|противогриппозн\w+\s+вакцин\w+"],
 ["пневмококковая вакцинация", "pneumococcal vaccine", r"пневмококков\w+\s+вакцин\w+"],
 ["отказ от курения", "smoking cessation", r"отказ\w*\s+от\s+курени\w+"],
 ["ограничение соли", "salt reduction", r"ограничени\w+\s+(?:потреблени\w+\s+)?(?:поваренной\s+)?соли"],
 ["физическая активность и упражнения", "exercise training", r"физическ\w+\s+(?:нагрузк\w+|упражнени\w+|тренировк\w+)|аэробн\w+\s+нагрузк\w+"],
 ["снижение массы тела", "weight loss", r"снижени\w+\s+массы\s+тела"],
 ["самоконтроль гликемии", "self-monitoring of blood glucose", r"самоконтрол\w+\s+гликеми\w+"],
 ["компрессионный трикотаж", "compression stockings", r"компрессионн\w+\s+трикотаж\w*"],
 ["имплантация кардиовертера-дефибриллятора", "implantable cardioverter defibrillator", r"кардиовертер\w*-дефибриллятор\w*|\bИКД\b"],
 ["постоянная электрокардиостимуляция", "pacemaker", r"электрокардиостимул\w+|\bЭКС\b"],
]
# заболевание каждой КР — второе слово запроса
COND = {
 "62_3": "hypertension", "155_2": "stable angina OR coronary artery disease", "156_2": "heart failure", "752_1": "dyslipidemia OR hypercholesterolemia",
 "160_2": "bradycardia OR heart block", "569_2": "ventricular arrhythmia", "382_2": "atrial fibrillation", "619_3": "supraventricular tachycardia",
 "154_4": "acute coronary syndrome", "157_5": "myocardial infarction", "814_1": "stroke", "290_2": "type 2 diabetes", "469_3": "chronic kidney disease",
 "894_1": "IgA nephropathy", "816_1": "focal segmental glomerulosclerosis", "359_3": "asthma", "603_3": "chronic obstructive pulmonary disease",
 "655_2": "chronic bronchitis", "654_2": "community-acquired pneumonia", "838_1": "viral pneumonia", "783_1": "hypersensitivity pneumonitis",
 "677_1": "idiopathic pulmonary fibrosis", "795_1": "lung transplantation", "277_2": "peptic ulcer", "708_2": "gastritis OR Helicobacter pylori",
 "273_5": "chronic pancreatitis", "715_2": "liver cirrhosis", "711_2": "alcoholic liver disease", "1033_1": "primary biliary cholangitis",
 "176_2": "Crohn disease", "193_2": "ulcerative colitis", "1000_1": "eosinophilic esophagitis", "87_5": "osteoporosis",
 "617_5": "dementia OR cognitive impairment", "115_3": "diabetic retinopathy", "738_2": "familial adenomatous polyposis", "949_1": "colorectal polyps",
 "574_3": "gastric cancer", "1_4": "hepatocellular carcinoma", "893_1": "cancer of unknown primary",
}

def pattern(ru, rx=None):
    if rx: return rx
    w = re.escape(ru)
    return r"(?<![\w-])#?" + w + r"\w{0,3}(?![\w])"

def build(kr_dir, out):
    P = lambda h: re.sub(r'\s+', ' ', re.sub('<[^>]+>', ' ', h)).replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&')
    terms = [dict(kind='drug', ru=x[0], en=x[1], rx=pattern(x[0], x[2] if len(x) > 2 else None)) for x in DRUGS] + \
            [dict(kind='method', ru=x[0], en=x[1], rx=x[2]) for x in METHODS]
    for t in terms: t['id'] = re.sub(r'[^a-z0-9]+', '_', t['en'].lower()).strip('_')
    found = collections.defaultdict(dict)
    for f in sorted(glob.glob(os.path.join(kr_dir, '*.json'))):
        d = json.load(open(f))
        parts = [x['html'] for x in d['treatment'] + d.get('treatment_special', []) + d['dose_tables']]
        for k in ('doses', 'dose_table'):
            if d.get(k): parts += [' '.join(map(str, r)) for r in d[k]['rows']]
        txt = P(' '.join(parts))
        for t in terms:
            n = len(re.findall(t['rx'], txt, flags=re.I))
            if n: found[d['id']][t['id']] = n
    used = collections.Counter(tid for v in found.values() for tid in v)
    res = {
        'about': 'Термины для ссылок «препарат/метод → обзоры Cochrane». Поиск выполняет приложение (PubMed E-utilities), абстракты не хранятся. См. docs/cochrane.md',
        'query': {
            'esearch': 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=10&sort=relevance&term={term}',
            'term_with_condition': '({en}[tiab] OR {en}[mh]) AND ({condition}) AND "Cochrane Database Syst Rev"[ta] NOT retracted publication[pt]',
            'term_fallback': '({en}[tiab] OR {en}[mh]) AND "Cochrane Database Syst Rev"[ta] NOT retracted publication[pt]',
            'esummary': 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id={ids}',
            'efetch_abstract': 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&rettype=abstract&retmode=xml&id={pmid}',
            'cochrane_en': 'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.{cd}/full',
            'cochrane_ru': 'https://www.cochrane.org/ru/{cd_base}',
        },
        'conditions': COND,
        'terms': [dict(t, used_in=used.get(t['id'], 0)) for t in terms],
        'by_kr': found,
    }
    json.dump(res, open(out, 'w'), ensure_ascii=False, indent=1)
    print('терминов:', len(terms), '| встречаются в КР:', sum(1 for t in terms if used.get(t['id'])), '| не встречаются:', [t['ru'] for t in terms if not used.get(t['id'])])
    print('КР с терминами:', len(found), '| без:', sorted(set(COND) - set(found)))
    for k in ['62_3', '156_2', '382_2', '603_3', '87_5']:
        print(k, sorted(found[k].items(), key=lambda x: -x[1])[:12])

if __name__ == '__main__':
    build(sys.argv[1], sys.argv[2])
