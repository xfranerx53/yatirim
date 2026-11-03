import json, urllib.request, datetime, os, math

def ff(url):
    req=urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0"})
    return json.loads(urllib.request.urlopen(req, timeout=40).read())

def ohlc(sym, rng="3y", iv="1d"):
    d=ff(f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}?range={rng}&interval={iv}")["chart"]["result"][0]
    q=d["indicators"]["quote"][0]
    return [(h,l,c) for h,l,c in zip(q["high"],q["low"],q["close"]) if None not in (h,l,c)]

def ema_list(a,n):
    if len(a)<n: return [None]*len(a)
    k=2/(n+1); e=sum(a[:n])/n; r=[None]*(n-1)+[e]
    for p in a[n:]: e=p*k+e*(1-k); r.append(e)
    return r

def skor_hesapla(H,L,C,i):
    # i = değerlendirilecek gün indeksi (dahil). En az 200 geçmiş ister.
    if i<200: return None,None
    c=C[:i+1]; h=H[:i+1]; l=L[:i+1]; fiyat=c[-1]; g=[]
    n=14; gain=loss=0
    for j in range(-n,0):
        d=c[j]-c[j-1]; gain+=max(d,0); loss+=max(-d,0)
    rs=100 if loss==0 else 100-100/(1+(gain/n)/(loss/n))
    g.append(["RSI (14)", round(rs), "AL" if rs<35 else "SAT" if rs>65 else "NÖTR"])
    hh=max(h[-14:]); ll=min(l[-14:])
    k=100*(fiyat-ll)/(hh-ll) if hh!=ll else 50
    g.append(["Stokastik %K", round(k), "AL" if k<20 else "SAT" if k>80 else "NÖTR"])
    wr=-100*(hh-fiyat)/(hh-ll) if hh!=ll else -50
    g.append(["Williams %R", round(wr), "AL" if wr<-80 else "SAT" if wr>-20 else "NÖTR"])
    tp=[(h[x]+l[x]+c[x])/3 for x in range(len(c))]; m=sum(tp[-20:])/20
    md=sum(abs(x-m) for x in tp[-20:])/20; cci=(tp[-1]-m)/(0.015*md) if md else 0
    g.append(["CCI (20)", round(cci), "AL" if cci<-100 else "SAT" if cci>100 else "NÖTR"])
    e12=ema_list(c,12); e26=ema_list(c,26)
    ml=[a-b for a,b in zip(e12,e26) if a is not None and b is not None]
    sig=ema_list(ml,9); macd=ml[-1]; sg=sig[-1] if sig[-1] is not None else ml[-1]
    g.append(["MACD", "+" if macd>sg else "−", "AL" if macd>sg else "SAT"])
    roc=100*(fiyat-c[-11])/c[-11]
    g.append(["Momentum (10g)", round(roc,1), "AL" if roc>0 else "SAT"])
    e20=ema_list(c,20)[-1]
    g.append(["Fiyat vs EMA20", round(fiyat-e20,1), "AL" if fiyat>e20 else "SAT"])
    s50=sum(c[-50:])/50
    g.append(["Fiyat vs MA50", round(fiyat-s50,1), "AL" if fiyat>s50 else "SAT"])
    s200=sum(c[-200:])/200
    g.append(["Fiyat vs MA200", round(fiyat-s200,1), "AL" if fiyat>s200 else "SAT"])
    m20=sum(c[-20:])/20; sd=math.sqrt(sum((x-m20)**2 for x in c[-20:])/20)
    pb=(fiyat-(m20-2*sd))/(4*sd) if sd else 0.5
    g.append(["Bollinger %B", round(pb,2), "AL" if pb<0.2 else "SAT" if pb>0.8 else "NÖTR"])
    al=sum(1 for x in g if x[2]=="AL"); sat=sum(1 for x in g if x[2]=="SAT")
    puan=max(0,min(100,50+(al-sat)*5))
    return puan, g

def kova(p):
    return "yuksek" if p>=55 else "dusuk" if p<=40 else "orta"

def backtest(H,L,C, ileri=20):
    # Her gün skoru hesapla, 'ileri' gün sonraki getiriyi kaydet, kovaya göre ortala
    sonuc={"yuksek":[], "orta":[], "dusuk":[]}
    for i in range(200, len(C)-ileri):
        p,_=skor_hesapla(H,L,C,i)
        if p is None: continue
        getiri=100*(C[i+ileri]-C[i])/C[i]
        sonuc[kova(p)].append(getiri)
    ozet={}
    for k,v in sonuc.items():
        if v:
            v2=sorted(v); n=len(v2)
            ozet[k]={"n":n,"ort":round(sum(v)/n,1),"medyan":round(v2[n//2],1),
                     "pozitif_oran":round(100*sum(1 for x in v if x>0)/n)}
        else:
            ozet[k]={"n":0}
    return ozet

liste=json.load(open("semboller.json"))["liste"]
res={"guncelleme":datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M")+" UTC",
     "ileri_gun":20, "varliklar":[]}
toplu={"yuksek":[], "orta":[], "dusuk":[]}
for v in liste:
    try:
        rows=ohlc(v["yahoo"])
        H=[r[0] for r in rows]; L=[r[1] for r in rows]; C=[r[2] for r in rows]
        puan,g=skor_hesapla(H,L,C,len(C)-1)
        bt=backtest(H,L,C)
        # toplu havuz için ham getirileri de topla
        for i in range(200,len(C)-20):
            p,_=skor_hesapla(H,L,C,i)
            if p is not None: toplu[kova(p)].append(100*(C[i+20]-C[i])/C[i])
        res["varliklar"].append({"ad":v["ad"],"tip":v["tip"],"para":v["para"],
            "fiyat":round(C[-1],2),"puan":puan,"gostergeler":g,
            "al":sum(1 for x in g if x[2]=="AL"),"sat":sum(1 for x in g if x[2]=="SAT"),
            "backtest":bt})
    except Exception as e:
        res["varliklar"].append({"ad":v["ad"],"hata":str(e)[:120]})
# toplu backtest
tb={}
for k,v in toplu.items():
    if v:
        v2=sorted(v); n=len(v2)
        tb[k]={"n":n,"ort":round(sum(v)/n,1),"medyan":round(v2[n//2],1),"pozitif_oran":round(100*sum(1 for x in v if x>0)/n)}
    else: tb[k]={"n":0}
res["toplu_backtest"]=tb
res["varliklar"].sort(key=lambda x:x.get("puan",-1), reverse=True)
json.dump(res, open("skor.json","w"), ensure_ascii=False, separators=(",",":"))
print("Varlık sayısı:", len(res["varliklar"]))
print("Toplu backtest (20 gün ileri getiri):", json.dumps(tb, ensure_ascii=False))
for v in res["varliklar"]:
    if "puan" in v: print(f'  {v["ad"]:>18}  puan={v["puan"]:>3}  (al {v["al"]} / sat {v["sat"]})')
    else: print(f'  {v["ad"]:>18}  HATA: {v.get("hata")}')
