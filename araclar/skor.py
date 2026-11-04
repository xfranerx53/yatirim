import json, urllib.request, datetime, os, math

def ff(url):
    req=urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0"})
    return json.loads(urllib.request.urlopen(req, timeout=40).read())

def ohlc(sym, rng, iv):
    d=ff(f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}?range={rng}&interval={iv}")["chart"]["result"][0]
    q=d["indicators"]["quote"][0]
    return [(h,l,c) for h,l,c in zip(q["high"],q["low"],q["close"]) if None not in (h,l,c)]

def dort_saat(rows):
    out=[]
    for i in range(0,len(rows)-len(rows)%4,4):
        g=rows[i:i+4]; out.append((max(x[0] for x in g), min(x[1] for x in g), g[-1][2]))
    return out

def ema_list(a,n):
    if len(a)<n: return [None]*len(a)
    k=2/(n+1); e=sum(a[:n])/n; r=[None]*(n-1)+[e]
    for p in a[n:]: e=p*k+e*(1-k); r.append(e)
    return r

def skor_series(H,L,C):
    # Hesaplanabildiği kadar göstergeyle puan üretir (4 saatlikte bazıları olmayabilir)
    n=len(C)
    if n<30: return None,None
    fiyat=C[-1]; g=[]
    gain=loss=0
    for j in range(-14,0):
        d=C[j]-C[j-1]; gain+=max(d,0); loss+=max(-d,0)
    rs=100 if loss==0 else 100-100/(1+(gain/14)/(loss/14))
    g.append(["RSI (14)", round(rs), "AL" if rs<35 else "SAT" if rs>65 else "NÖTR"])
    hh=max(H[-14:]); ll=min(L[-14:])
    k=100*(fiyat-ll)/(hh-ll) if hh!=ll else 50
    g.append(["Stokastik %K", round(k), "AL" if k<20 else "SAT" if k>80 else "NÖTR"])
    wr=-100*(hh-fiyat)/(hh-ll) if hh!=ll else -50
    g.append(["Williams %R", round(wr), "AL" if wr<-80 else "SAT" if wr>-20 else "NÖTR"])
    tp=[(H[x]+L[x]+C[x])/3 for x in range(n)]; m=sum(tp[-20:])/20
    md=sum(abs(x-m) for x in tp[-20:])/20; cci=(tp[-1]-m)/(0.015*md) if md else 0
    g.append(["CCI (20)", round(cci), "AL" if cci<-100 else "SAT" if cci>100 else "NÖTR"])
    e12=ema_list(C,12); e26=ema_list(C,26)
    ml=[a-b for a,b in zip(e12,e26) if a is not None and b is not None]
    if len(ml)>=9:
        sig=ema_list(ml,9); macd=ml[-1]; sg=sig[-1]
        g.append(["MACD", "+" if macd>sg else "−", "AL" if macd>sg else "SAT"])
    roc=100*(fiyat-C[-11])/C[-11]
    g.append(["Momentum (10)", round(roc,1), "AL" if roc>0 else "SAT"])
    e20=ema_list(C,20)[-1]
    g.append(["Fiyat vs EMA20", round(fiyat-e20,1), "AL" if fiyat>e20 else "SAT"])
    if n>=50:
        s50=sum(C[-50:])/50
        g.append(["Fiyat vs MA50", round(fiyat-s50,1), "AL" if fiyat>s50 else "SAT"])
    if n>=200:
        s200=sum(C[-200:])/200
        g.append(["Fiyat vs MA200", round(fiyat-s200,1), "AL" if fiyat>s200 else "SAT"])
    m20=sum(C[-20:])/20; sd=math.sqrt(sum((x-m20)**2 for x in C[-20:])/20)
    pb=(fiyat-(m20-2*sd))/(4*sd) if sd else 0.5
    g.append(["Bollinger %B", round(pb,2), "AL" if pb<0.2 else "SAT" if pb>0.8 else "NÖTR"])
    al=sum(1 for x in g if x[2]=="AL"); sat=sum(1 for x in g if x[2]=="SAT")
    puan=max(0,min(100,round(50+(al-sat)*5)))
    return puan, g

def kova(p): return "yuksek" if p>=55 else "dusuk" if p<=40 else "orta"

def backtest(H,L,C, ileriler=(10,20,60)):
    cache={}
    for i in range(200,len(C)):
        p,_=skor_series(H[:i+1],L[:i+1],C[:i+1]); cache[i]=p
    cikti={}
    for ileri in ileriler:
        kov={"yuksek":[],"orta":[],"dusuk":[]}
        for i in range(200,len(C)-ileri):
            if cache[i] is None: continue
            kov[kova(cache[i])].append(100*(C[i+ileri]-C[i])/C[i])
        oz={}
        for key,v in kov.items():
            if v:
                v2=sorted(v); n=len(v2)
                oz[key]={"n":n,"ort":round(sum(v)/n,1),"medyan":round(v2[n//2],1),"poz":round(100*sum(1 for x in v if x>0)/n)}
            else: oz[key]={"n":0}
        cikti[str(ileri)]=oz
    return cikti, cache

import urllib.parse, xml.etree.ElementTree as ET
def haberler(sorgu):
    try:
        q=urllib.parse.quote(sorgu)
        url=f"https://news.google.com/rss/search?q={q}&hl=tr&gl=TR&ceid=TR:tr"
        xml=urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0"}), timeout=30).read()
        root=ET.fromstring(xml); out=[]
        for it in root.iter("item"):
            baslik=(it.findtext("title") or "").strip()
            src=it.find("{*}source")
            kaynak=src.text if src is not None else ""
            if kaynak and baslik.endswith(" - "+kaynak): baslik=baslik[:-(len(kaynak)+3)]
            pub=it.findtext("pubDate") or ""
            out.append({"baslik":baslik,"link":it.findtext("link"),"kaynak":kaynak,"zaman":pub})
            if len(out)>=3: break
        return out
    except Exception as e:
        return []


liste=json.load(open("semboller.json"))["liste"]
res={"guncelleme":datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M")+" UTC",
     "ileriler":[10,20,60],"varliklar":[]}
toplu={"10":{},"20":{},"60":{}}
for ileri in toplu: toplu[ileri]={"yuksek":[],"orta":[],"dusuk":[]}

for v in liste:
    try:
        rows=ohlc(v["yahoo"],"3y","1d")
        H=[r[0] for r in rows]; L=[r[1] for r in rows]; C=[r[2] for r in rows]
        puan,g=skor_series(H,L,C)
        if puan is None:
            res["varliklar"].append({"ad":v["ad"],"tip":v["tip"],"para":v["para"],"fiyat":round(C[-1],2),"yetersiz":True}); continue
        gun_deg=round(100*(C[-1]-C[-2])/C[-2],2) if len(C)>1 else 0
        son252=C[-252:] if len(C)>=252 else C
        ymin=min(son252); ymax=max(son252)
        konum=round(100*(C[-1]-ymin)/(ymax-ymin)) if ymax>ymin else 50
        bt,cache=backtest(H,L,C)
        for ileri in toplu:
            il=int(ileri)
            for i in range(200,len(C)-il):
                if cache[i] is not None: toplu[ileri][kova(cache[i])].append(100*(C[i+il]-C[i])/C[i])
        # 4 saatlik kısa vade
        try:
            s=ohlc(v["yahoo"],"60d","60m"); d4=dort_saat(s)
            p4,g4=skor_series([x[0] for x in d4],[x[1] for x in d4],[x[2] for x in d4])
        except Exception: p4,g4=None,None
        res["varliklar"].append({"ad":v["ad"],"tip":v["tip"],"para":v["para"],
            "fiyat":round(C[-1],2),"gun_degisim":gun_deg,"yil_dusuk":round(ymin,2),"yil_yuksek":round(ymax,2),"yil_konum":konum,"puan":puan,"gostergeler":g,
            "al":sum(1 for x in g if x[2]=="AL"),"sat":sum(1 for x in g if x[2]=="SAT"),
            "puan4s":p4,"gostergeler4s":g4,"backtest":bt,"haberler":haberler(v.get("haber") or v["ad"])})
    except Exception as e:
        res["varliklar"].append({"ad":v["ad"],"hata":str(e)[:120]})

tb={}
for ileri,kov in toplu.items():
    oz={}
    for key,val in kov.items():
        if val:
            v2=sorted(val); n=len(v2)
            oz[key]={"n":n,"ort":round(sum(val)/n,1),"medyan":round(v2[n//2],1),"poz":round(100*sum(1 for x in val if x>0)/n)}
        else: oz[key]={"n":0}
    tb[ileri]=oz
res["toplu_backtest"]=tb
res["varliklar"].sort(key=lambda x:x.get("puan",-1), reverse=True)
json.dump(res, open("skor.json","w"), ensure_ascii=False, separators=(",",":"))
for v in res["varliklar"]:
    if "puan" in v: print(f'  {v["ad"]:>18} g{v["puan"]:>3} 4s={v.get("puan4s")} haber={len(v.get("haberler",[]))}')
    else: print(f'  {v["ad"]:>18} {v.get("hata",v.get("yetersiz"))}')
print("TOPLU 20g:", tb["20"])
