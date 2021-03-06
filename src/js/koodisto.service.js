'use strict';

justusApp.service('KoodistoService', ['$http', function($http) {

  //console.debug(location)
  let baseuri = "https://virkailija.opintopolku.fi/koodisto-service/rest/json/";
  //if (location.hostname=='127.0.0.1' || location.hostname=='localhost') {
  //  baseuri = "https://testi.virkailija.opintopolku.fi/koodisto-service/rest/json/";
  //}
  let maxage = 1*60*1000; // millisekunteja
  console.log("KoodistoService baseuri for "+location.hostname+" is "+baseuri+" localStorage "+(typeof(Storage) !== "undefined")+" maxage "+maxage)

  //
  // internal private functions
  // not in 'this', so unscoped
  //

  // suorita HTTP-kutsu ja palauta JSON
  let callURI = function(fulluri) {
    console.log("KoodistoService.callURI "+fulluri);
    /* localStorage:
    //let store = this.store;
    let stored = store(fulluri);
    if (stored) {
      // tässäpä hacki. kutsutaan '/' (localhost) jotta saadaan sama palautusmuoto. *huoh*
      // huomaa myös että palautetaan stored-muuttuja
      return $http.get('/').then(function(response){return stored;});
    }
    //*/
    return $http.get(fulluri).then(function(response){
      let ret = [];
      angular.forEach(response.data,function(robj,skey){
        var obj={};
        obj.arvo = robj.koodiArvo;
        obj.selite = {
          FI: getLanguageSpecificValueOrValidValue(robj.metadata,"nimi","FI"),
          SV: getLanguageSpecificValueOrValidValue(robj.metadata,"nimi","SV"),
          EN: getLanguageSpecificValueOrValidValue(robj.metadata,"nimi","EN")
        };
        obj.kuvaus = {
          FI: getLanguageSpecificValueOrValidValue(robj.metadata,"kuvaus","FI"),
          SV: getLanguageSpecificValueOrValidValue(robj.metadata,"kuvaus","SV"),
          EN: getLanguageSpecificValueOrValidValue(robj.metadata,"kuvaus","EN")
        };
        ret.push(obj);
      });
      /* localStorage:
      //console.log("callURI trying to save..."+fulluri)
      //console.debug(ret)
      store(fulluri,ret);
      //*/
      return ret;
    });
  }

  // ei vielä käytössä (ks callURI tai justus.controller)
  // vähän ongelmaa asynkronisuuden kanssa. sisäkkäinen http-kutsu on liikaa.
  // tai sitten ongelmaa sen kanssa, että ei palauteta http state objektia.
  // ehkä tätä ei kannata tehdä. kutsutaan vain koodistopalvelua joka kerta...
  /* localStorage:
  this.store = function(key,value) {
    console.log("KoodistoService.store "+key);
    if (!key) return;
    if (typeof(Storage) !== "undefined") {
      //console.debug(localStorage.getItem(key))
      //console.debug(localStorage.getItem(key+"dateset"))
      if (value) { // store given value no matter what
        // tallenna localStorageen
        localStorage.setItem(key+'dateset',new Date());
        //console.log("store save "+key);
        //console.debug(value);
        localStorage.setItem(key,JSON.stringify(value));
      }
      if (localStorage.getItem(key)) {
        let age = (new Date()).getTime() - new Date(localStorage.getItem(key+'dateset')).getTime();
        //console.debug(age)
        if (age > maxage) { // remove item if outaged
          localStorage.removeItem(key);
          localStorage.removeItem(key+'dateset');
        }
      }
    } else {
      console.log("KoodistoService no Web Storage")
    }
    //console.log("store return "+key);
    //console.debug(localStorage.getItem(key))
    return JSON.parse(localStorage.getItem(key));
  }
  //*/

  //
  // ACCESSORIT
  //

  // hae yksittäisen koodiarvon tiedot
  this.getKoodi = function(koodisto,koodi) {
    if(!koodisto) return;
    if(!koodi) return;
    var uri = baseuri+(koodisto+"/koodi/"+koodisto+"_"+koodi).toLowerCase();
    return callURI(uri);
  }

  // hae koko koodiston koodien tiedot yhdellä kutsulla
  this.getKoodisto = function(koodisto) {
    if(!koodisto) return;
    return callURI(baseuri+koodisto+"/koodi"+"?onlyValidKoodis=false");
  }

  // hae koko koodisto ja sen koodeihin sisältyvät koodit
  // - pitäisi valita/tietää minkä koodiston koodit jos useita!
  // - vain ennalta tunnettuja!
  // -- julkaisunpaaluokka -> julkaisutyyppi
  // -- paatieteenala -> tieteenala
  // - isot luokitukset, kuten koulutus, harkinnan mukaan
  this.getLuokitus = function(koodisto) {
    if(!koodisto) return;

    //let baseuri = this.baseuri; // kopioi lokaaliksi muuttujaksi (this skooppi vaihtelee)
    //let callURI = this.callURI;
    let getAlatyypit = this.getAlatyypit;
    //return this.getKoodisto(koodisto)
    //.then(function (robj){
    let promise = this.getKoodisto(koodisto);
    promise.then(function (robj){
      let ret=[];
      angular.forEach(robj,function(aobj,akey){
        let obj=aobj;
        let alapromise = getAlatyypit(koodisto,aobj.arvo);
        alapromise.then(function (o) {
          obj.alatyypit = o;
        });
        ret.push(obj);
      });
      return ret;
    });
    return promise;
  }
  this.getAlatyypit = function(koodisto,arvo) {
    if(!koodisto) return;
    if(!arvo) return;
    let alapromise = callURI(baseuri+'relaatio/sisaltyy-alakoodit/'+koodisto+'_'+arvo.toLowerCase());
    return alapromise.then(function (robj) {
      // JUSTUS exceptions
      if (koodisto=='julkaisunpaaluokka') {
        let ret=[];
        angular.forEach(robj,function(aobj,akey){
          if (1==0
            || (arvo=="A" && ["A1","A2","A3","A4"          ].indexOf(aobj.arvo)>=0)
            || (arvo=="B" && ["B1","B2","B3"               ].indexOf(aobj.arvo)>=0)
            || (arvo=="C" && ["C1","C2"                    ].indexOf(aobj.arvo)>=0)
            || (arvo=="D" && ["D1","D2","D3","D4","D5","D6"].indexOf(aobj.arvo)>=0)
            || (arvo=="E" && ["E1","E2","E3"               ].indexOf(aobj.arvo)>=0)
            || (arvo=="G" && [               "G4","G5"     ].indexOf(aobj.arvo)>=0)
          ) {
            ret.push(aobj);
          }
        });
        return ret;
      }
      return robj;
    });
  }

}]);
