import { useState, useMemo, useEffect, useCallback } from "react";

const safeUrl = (u) => /^https?:\/\//i.test(u) ? u : '#';
// Derive trip cost display from costs data so it stays in sync with the breakdown.
// tType:'local' = no transport/hotel cost; 'drive' or 'fly' = show full subtotal.
const tripDisplay = (e) => {
  const c = e.costs;
  if (!c) return e.travel;
  if (c.tType === 'local') return 'Local';
  if (c.tType === 'fly') return `~$${c.subtotal} (fly)`;
  return c.subtotal > 0 ? `~$${c.subtotal} drive` : 'Driveable';
};

// ─── ATTENDANCE ────────────────────────────────────────────────────────────────
const ATT = [
  { v:"maybe",    l:"Maybe Going",        c:"text-gray-200",    bg:"bg-gray-700",     b:"border-gray-500",    dot:"bg-gray-400"     },
  { v:"planning", l:"Planning to Go",     c:"text-sky-200",     bg:"bg-sky-900",      b:"border-sky-500",     dot:"bg-sky-400"      },
  { v:"paid",     l:"Paid / Registered",  c:"text-emerald-200", bg:"bg-emerald-900",  b:"border-emerald-600", dot:"bg-emerald-400"  },
  { v:"went",     l:"Went! 🎉",           c:"text-yellow-200",  bg:"bg-yellow-900",   b:"border-yellow-500",  dot:"bg-yellow-400"   },
];

// Driveable = within Boston-to-DC (~7.5 hr) or Boston-to-Montreal (~5 hr) range.
// PTO: weekday count within event dates + 1 rest day if returning home >3 hr Sunday drive/flight.
// restDay asterisk (*) on badge means rest day included.

const EVENTS = [
  // ══════════════════════ 2026 PAST (ended before Apr 4, 2026) ══════════════════════
  {
    id:1, year:2026, past:true,
    name:"Rock That Swing Festival", dates:"Feb 12–16", month:2, day:12,
    style:"Multi", region:"Europe", city:"Munich, Germany",
    price:"€200–400", travel:"~$970 (fly)", driveable:false,
    ticketStatus:"Open", ticketNote:"Modular day/evening passes",
    url:"https://rockthatswing.com", type:"Festival",
    description:"73 teachers, 19 bands, 340+ workshops. Chester Whitmore as 2026 special guest. Europe's largest swing festival.",
    workshop:4, social:4, comp:3, ageMatch:4, levelMatch:4,
    ageNote:"European scene skews 25–45; well-established community crowd",
    levelNote:"Strong Int/Adv presence; some beginners due to festival scale",
    daysOff:3, restDay:false, ptoTotal:3, ptoNote:"Thu 12, Fri 13, Mon 16",
    conflicts:[2,3,4],
    costs:{
      transport:850, tType:"fly", tNote:"BOS→MUC RT economy",
      hotelNights:4, hotelRate:210, hotel:840,
      foodPerDay:90, foodDays:5, food:450,
      localXport:50, localNote:"S-Bahn/taxi in Munich",
      passMin:220, passMax:440,
      subtotal:2190, totalMin:2410, totalMax:2630,
      eventNote:"Munich city hotel; book early for Feb festival pricing",
    },
  },
  {
    id:2, year:2026, past:true,
    name:"The Flurry Festival", dates:"Feb 13–15", month:2, day:13,
    style:"Multi", region:"New England", city:"Saratoga Springs, NY",
    price:"$45–220", travel:"Driveable (~3.5 hrs)", driveable:true,
    ticketStatus:"Open", ticketNote:"Day passes available; Swing Intensive $58",
    url:"https://www.flurryfestival.org", type:"Festival",
    description:"4,500 attendees, 400+ performers, 222 sessions. 15+ dance genres. Swing programming includes Nathan Bugh and Gaby Cook.",
    workshop:3, social:3, comp:1, ageMatch:2, levelMatch:2,
    ageNote:"Very broad: families, teens, and seniors all attend; folk/world audience mix",
    levelNote:"Beginner-heavy across many styles; swing floor quality varies",
    daysOff:1, restDay:true, ptoTotal:2, ptoNote:"Fri 13 + Mon rest day (~3.5 hr return Sunday)",
    conflicts:[1,3,4],
    costs:{
      transport:58, tType:"drive", tNote:"~3.5 hr drive, gas + tolls RT",
      hotelNights:2, hotelRate:145, hotel:290,
      foodPerDay:60, foodDays:2, food:120,
      localXport:0, localNote:"Walkable venue in downtown Saratoga",
      passMin:58, passMax:130,
      subtotal:468, totalMin:526, totalMax:598,
      eventNote:"Book lodging early — Saratoga fills for Flurry weekend",
    },
  },
  {
    id:3, year:2026, past:true,
    name:"Rose City Blues", dates:"Feb 20–22", month:2, day:20,
    style:"Blues", region:"West Coast", city:"Portland, OR",
    price:"$100–150", travel:"~$770 (fly)", driveable:false,
    ticketStatus:"Open", ticketNote:"POC & LGBTQIA+ safer space focus",
    url:"https://pdxblues.com/rose-city-blues", type:"Weekend Event",
    description:"Portland's dedicated blues weekend celebrating Black History Month at Alberta Abbey. COVID testing required.",
    workshop:3, social:4, comp:0, ageMatch:4, levelMatch:3,
    ageNote:"Pacific NW blues community skews 25–42; activist/queer-centered culture",
    levelNote:"Mixed levels; community-focused rather than all-star heavy",
    daysOff:1, restDay:true, ptoTotal:2, ptoNote:"Fri 20 + Mon rest day (flight required)",
    conflicts:[1,2,4,5],
    costs:{
      transport:340, tType:"fly", tNote:"BOS→PDX RT economy",
      hotelNights:2, hotelRate:125, hotel:250,
      foodPerDay:65, foodDays:2, food:130,
      localXport:50, localNote:"Uber PDX→hotel→Alberta Abbey",
      passMin:100, passMax:150,
      subtotal:770, totalMin:870, totalMax:920,
      eventNote:"Portland budget hotels ~$110-140; Alberta Abbey is NE Portland",
    },
  },
  {
    id:4, year:2026, past:true,
    name:"Salt City Stomp", dates:"Feb 20–22", month:2, day:20,
    style:"Lindy", region:"West", city:"Salt Lake City, UT",
    price:"$120–175", travel:"~$740 (fly)", driveable:false,
    ticketStatus:"Open", ticketNote:"Early bird sold out; standard passes available",
    url:"https://www.saltcitystomp.com", type:"Weekend Event",
    description:"Anthony Chen, Hannah Lane, Timothy Christopher. Live music by Hot House West Swing Orchestra.",
    workshop:4, social:3, comp:3, ageMatch:3, levelMatch:3,
    ageNote:"Regional mountain-west crowd; broader age range including younger college dancers",
    levelNote:"Solid Int/Adv but regional footprint limits all-star density on social floor",
    daysOff:1, restDay:true, ptoTotal:2, ptoNote:"Fri 20 + Mon rest day (flight required)",
    conflicts:[1,2,3,5],
    costs:{
      transport:280, tType:"fly", tNote:"BOS→SLC RT economy",
      hotelNights:2, hotelRate:155, hotel:310,
      foodPerDay:60, foodDays:2, food:120,
      localXport:40, localNote:"Uber SLC airport to downtown hotels",
      passMin:120, passMax:175,
      subtotal:750, totalMin:870, totalMax:925,
      eventNote:"SLC airport hotels slightly cheaper than downtown",
    },
  },
  {
    id:5, year:2026, past:true,
    name:"Steel City Blues", dates:"Feb 27–Mar 1", month:2, day:27,
    style:"Blues", region:"Mid-Atlantic", city:"Pittsburgh, PA",
    price:"$200–270", travel:"~$610 (fly)", driveable:false,
    ticketStatus:"Open", ticketNote:"$200 standard / $270 supporter. Regularly sells out.",
    url:"https://steelcityblues.com", type:"Weekend Event",
    description:"Running since 2008. Three workshop tracks, live Rust Belt bands, strong blues culture focus. Fragrance-free.",
    workshop:4, social:4, comp:2, ageMatch:4, levelMatch:4,
    ageNote:"Core blues community crowd, 26–45; culturally serious, curated vibe filters age extremes",
    levelNote:"Int/Adv dominant; older event with returning community of skilled dancers",
    daysOff:1, restDay:true, ptoTotal:2, ptoNote:"Fri 27 + Mon rest day (flight — Pittsburgh is ~8.5 hrs, over drive limit)",
    conflicts:[3,4,6],
    costs:{
      transport:180, tType:"fly", tNote:"BOS→PIT RT economy",
      hotelNights:2, hotelRate:195, hotel:390,
      foodPerDay:60, foodDays:2, food:120,
      localXport:40, localNote:"Uber PIT airport to downtown",
      passMin:200, passMax:270,
      subtotal:730, totalMin:930, totalMax:1000,
      eventNote:"Pittsburgh weekend rates run high; book early",
    },
  },
  {
    id:6, year:2026, past:true,
    name:"MADjam", dates:"Mar 5–8", month:3, day:5,
    style:"WCS", region:"Mid-Atlantic", city:"Reston, VA",
    price:"$225", travel:"Driveable (~7.5 hrs)", driveable:true,
    ticketStatus:"Open", ticketNote:"$225 standard. Tier 6 WSDC.",
    url:"https://www.atlanticdancejam.com", type:"Convention",
    description:"World's Largest WCS Party. Tier 6 WSDC. Nearly every Classic & Showcase champion. 40+ hours of workshops.",
    workshop:5, social:4, comp:5, ageMatch:4, levelMatch:5,
    ageNote:"WCS competitive community skews 28–52; serious hobbyist demographic",
    levelNote:"Every top All-Star WCS dancer attends; floor packed with champions and rising stars",
    daysOff:2, restDay:true, ptoTotal:3, ptoNote:"Thu 5, Fri 6 + Mon rest day (~7.5 hr drive back Sunday night)",
    conflicts:[5,7],
    costs:{
      transport:136, tType:"drive", tNote:"~7.5 hr drive, gas + tolls RT (I-95)",
      hotelNights:3, hotelRate:185, hotel:555,
      foodPerDay:70, foodDays:3, food:210,
      localXport:20, localNote:"Event hotel (Hyatt Regency Dulles), mostly walkable",
      passMin:225, passMax:225,
      subtotal:921, totalMin:1146, totalMax:1146,
      eventNote:"Book MADjam hotel block — rates better than open market",
    },
  },
  {
    id:7, year:2026, past:true,
    name:"The Great Southwest Lindyfest", dates:"Mar 12–16", month:3, day:12,
    style:"Lindy", region:"South", city:"Houston, TX",
    price:"$200–300", travel:"~$690 (fly)", driveable:false,
    ticketStatus:"Open", ticketNote:"$300 full pass; $200 party pass.",
    url:"https://www.danceplace.com", type:"Weekend Event",
    description:"Texas's largest Lindy event with Lone Star Championships. Leveled workshops with audition. Live music by Golden Hour Orchestra.",
    workshop:4, social:4, comp:4, ageMatch:3, levelMatch:3,
    ageNote:"Broad Texas/regional Lindy community; some college-age dancers mix with 30–50 crowd",
    levelNote:"Auditioned workshops help; floor has good Int/Adv showing during comps, mixed social",
    daysOff:3, restDay:false, ptoTotal:3, ptoNote:"Thu 12, Fri 13, Mon 16 (ends Monday)",
    conflicts:[6],
    costs:{
      transport:250, tType:"fly", tNote:"BOS→HOU RT economy",
      hotelNights:4, hotelRate:140, hotel:560,
      foodPerDay:60, foodDays:4, food:240,
      localXport:60, localNote:"Uber IAH→hotel; Houston requires Uber everywhere",
      passMin:200, passMax:300,
      subtotal:1110, totalMin:1310, totalMax:1410,
      eventNote:"Houston hotels mid-range; event runs Thu-Mon so 4 nights",
    },
  },
  {
    id:8, year:2026, past:true,
    name:"Meet in the Middle", dates:"Mar 27–29", month:3, day:27,
    style:"Multi", region:"Canada", city:"Kingston, Ontario",
    price:"A la carte", travel:"Driveable (~6 hrs)", driveable:true,
    ticketStatus:"Open", ticketNote:"Returning after 5-year hiatus. Affordable community pricing.",
    url:"https://www.swingplanit.com", type:"Exchange",
    description:"Returning after 5-year hiatus. Live bands from Mississauga and Montréal. Draws Ottawa, Montréal, Toronto, and Rochester dancers.",
    workshop:2, social:4, comp:0, ageMatch:3, levelMatch:3,
    ageNote:"Mixed community exchange; return after hiatus may skew older loyal crowd",
    levelNote:"Exchange format naturally attracts intermediate+ but no strong filtering mechanism",
    daysOff:1, restDay:true, ptoTotal:2, ptoNote:"Fri 27 + Mon rest day (~6 hr Sunday drive)",
    conflicts:[9,10],
    costs:{
      transport:99, tType:"drive", tNote:"~6 hr drive Boston→Kingston, gas + tolls RT",
      hotelNights:2, hotelRate:135, hotel:270,
      foodPerDay:60, foodDays:2, food:120,
      localXport:0, localNote:"Walkable small-city exchange",
      passMin:40, passMax:80,
      subtotal:489, totalMin:529, totalMax:569,
      eventNote:"Canadian lodging ~30% cheaper than US equiv; budget ~$100 USD/night",
    },
  },
  {
    id:9, year:2026, past:true,
    name:"River City Mess Around", dates:"Mar 27–29", month:3, day:27,
    style:"Multi", region:"Midwest", city:"St. Louis, MO",
    price:"$80–120", travel:"~$660 (fly)", driveable:false,
    ticketStatus:"TBD", ticketNote:"Returning after 6-year hiatus. 2026 dates confirmed; pricing TBA.",
    url:"https://www.rivercityswingout.com/rcma", type:"Exchange",
    description:"Returning after 6-year hiatus! All-St. Louis bands. 18.5 hrs of dancing. St. Louis Shag and Imperial Swing heritage.",
    workshop:2, social:4, comp:2, ageMatch:4, levelMatch:4,
    ageNote:"Heritage exchange culture; returning after 6-yr gap means mostly loyal 28–48 crowd",
    levelNote:"St. Louis dance heritage crowd is experienced; strong Int/Adv on the floor",
    daysOff:1, restDay:true, ptoTotal:2, ptoNote:"Fri 27 + Mon rest day (flight to St. Louis)",
    conflicts:[8,10],
    costs:{
      transport:200, tType:"fly", tNote:"BOS→STL RT economy",
      hotelNights:2, hotelRate:145, hotel:290,
      foodPerDay:55, foodDays:2, food:110,
      localXport:40, localNote:"Uber from airport; STL is spread out",
      passMin:80, passMax:120,
      subtotal:640, totalMin:720, totalMax:760,
      eventNote:"St. Louis is one of the cheaper US destinations",
    },
  },
  {
    id:10, year:2026, past:true,
    name:"Boston Tea Party Swings", dates:"Mar 26–29", month:3, day:26,
    style:"Multi", region:"New England", city:"Newton, MA",
    price:"$205", travel:"Driveable (<1 hr)", driveable:true,
    ticketStatus:"Open", ticketNote:"$205 standard. Student $175. WSDC-sanctioned WCS comps.",
    url:"https://teapartyswings.com", type:"Weekend Event",
    description:"Only remaining crossover swing event in the US. Separate ballrooms for WCS and Lindy/Bal. New for 2026: Carolina Shag track.",
    workshop:4, social:4, comp:3, ageMatch:3, levelMatch:3,
    ageNote:"Crossover draws wide range; NE regional crowd with some students; decent 28–48 showing",
    levelNote:"Mixed levels by design (crossover); solid Int but beginner tracks dilute floor density",
    daysOff:2, restDay:false, ptoTotal:2, ptoNote:"Thu 26, Fri 27 (Newton MA — local, no rest day needed)",
    conflicts:[8,9],
    costs:{
      transport:0, tType:"local", tNote:"Local — drive from Boston area, no tolls",
      hotelNights:0, hotelRate:0, hotel:0,
      foodPerDay:70, foodDays:3, food:210,
      localXport:10, localNote:"Gas money only",
      passMin:205, passMax:205,
      subtotal:220, totalMin:425, totalMax:425,
      eventNote:"Home event — biggest cost is the pass itself",
    },
  },

  // ══════════════════════ 2026 UPCOMING ══════════════════════════════════════════
  {
    id:11, year:2026, past:false,
    name:"Kind of a Big Deal Weekend", dates:"Apr 10–12", month:4, day:10,
    style:"Lindy", region:"New England", city:"Watertown, MA",
    price:"$38–74", travel:"Driveable (<1 hr)", driveable:true,
    ticketStatus:"TBD", ticketNote:"$74 two-night bundle; single nights $38–45.",
    url:"https://www.bostonswingcentral.org/kind-of-a-big-deal-weekend/", type:"Weekend Event",
    description:"Boston Swing Central's flagship event. Gordon Webster Band live. Mix & Match and Solo Jazz competitions.",
    workshop:3, social:4, comp:3, ageMatch:3, levelMatch:3,
    ageNote:"Boston local scene; broad mix including MIT/college dancers; decent core 28–45 crowd",
    levelNote:"Regional mixed; regulars are intermediate but open-to-all creates wide skill spread",
    daysOff:1, restDay:false, ptoTotal:1, ptoNote:"Fri 10 only (ends Saturday — local, no rest day)",
    conflicts:[],
    costs:{
      transport:0, tType:"local", tNote:"Local — drive from Boston area",
      hotelNights:0, hotelRate:0, hotel:0,
      foodPerDay:70, foodDays:1, food:70,
      localXport:10, localNote:"Gas only",
      passMin:38, passMax:74,
      subtotal:80, totalMin:118, totalMax:154,
      eventNote:"One of the lowest-cost events of the year",
    },
  },
  {
    id:12, year:2026, past:false,
    name:"DCLX (DC Lindy Exchange)", dates:"Apr 24–26", month:4, day:24,
    style:"Lindy", region:"Mid-Atlantic", city:"Glen Echo, MD",
    price:"$60–80", travel:"Driveable (~7.5 hrs)", driveable:true,
    ticketStatus:"Sold Out", ticketNote:"Full passes SOLD OUT. Individual dance tickets now on sale at dclx.org — purchase per dance (~$25 each).",
    url:"https://dclx.org", type:"Exchange",
    description:"Pure exchange legend — no workshops, no comps, just world-class social dancing in the historic Spanish Ballroom + outdoor Dupont Circle dances.",
    workshop:0, social:5, comp:0, ageMatch:5, levelMatch:5,
    ageNote:"Overwhelmingly 28–48; self-selecting exchange culture weeds out beginners and teenagers",
    levelNote:"Gold standard — floor packed with the best social dancers in North America",
    daysOff:1, restDay:true, ptoTotal:2, ptoNote:"Fri 24 + Mon rest day (~7.5 hr drive back from DC Sunday night)",
    conflicts:[],
    costs:{
      transport:131, tType:"drive", tNote:"~7.5 hr drive, gas + tolls RT (I-95)",
      hotelNights:2, hotelRate:185, hotel:370,
      foodPerDay:70, foodDays:2, food:140,
      localXport:30, localNote:"Uber/Metro to Spanish Ballroom (Glen Echo Park)",
      passMin:60, passMax:80,
      subtotal:671, totalMin:731, totalMax:751,
      eventNote:"DCLX pass is cheap; hotel is the main cost",
    },
  },
  {
    id:13, year:2026, past:false,
    name:"Jazz Town", dates:"May 14–17", month:5, day:14,
    style:"Lindy", region:"Mid-Atlantic", city:"Philadelphia / Baltimore, MD",
    price:"$15–25/dance", travel:"Driveable (~5.5 hrs)", driveable:true,
    ticketStatus:"TBD", ticketNote:"A la carte ~$15–25/dance. Sunday free. 2026 dates TBD.",
    url:"https://www.jazzattackswings.com/jazztown", type:"Exchange",
    description:"Unique two-city exchange (Philly + Baltimore). Live bands both weekends. 400+ dancers. Solo Jazz and Strictly competitions.",
    workshop:2, social:5, comp:3, ageMatch:4, levelMatch:4,
    ageNote:"Urban exchange scene strongly 26–44; Philly/Baltimore Lindy communities are experienced and mature",
    levelNote:"High Int/Adv density; exchange format self-selects; live band events draw serious dancers",
    daysOff:2, restDay:true, ptoTotal:3, ptoNote:"Thu 14, Fri 15 + Mon rest day (~5.5 hr drive back Sunday from Philly)",
    conflicts:[14,15],
    costs:{
      transport:97, tType:"drive", tNote:"~5.5 hr drive Boston→Philly, gas + tolls RT",
      hotelNights:3, hotelRate:165, hotel:495,
      foodPerDay:65, foodDays:3, food:195,
      localXport:30, localNote:"Uber between Philly and Baltimore venues",
      passMin:60, passMax:100,
      subtotal:817, totalMin:877, totalMax:917,
      eventNote:"Two-city format; budget hotel in either Philly or Baltimore",
    },
  },
  {
    id:14, year:2026, past:false,
    name:"Canadian Swing Championships", dates:"May 15–18", month:5, day:15,
    style:"Multi", region:"Canada", city:"near Montréal, QC",
    price:"~$85 CAD+", travel:"Driveable (~5 hrs)", driveable:true,
    ticketStatus:"Open", ticketNote:"~$110 CAD workshops; full pass varies. Canada's largest swing event (~800 dancers).",
    url:"https://www.canadianswingchampionships.com", type:"Convention",
    description:"Canada's largest swing event. Competitions in 7+ styles including Lindy, WCS, Balboa, Blues, Boogie Woogie. 3+ rooms with live bands nightly.",
    workshop:3, social:4, comp:4, ageMatch:3, levelMatch:4,
    ageNote:"Competition event draws 25–50 focused crowd; broader than pure exchange but comp-motivated",
    levelNote:"National championship caliber attracts strong Adv/All-Star competitors; social floors good",
    daysOff:2, restDay:false, ptoTotal:2, ptoNote:"Fri 15, Mon 18 (ends Monday — drive home Mon, no extra rest day)",
    conflicts:[13,15],
    costs:{
      transport:90, tType:"drive", tNote:"~5 hr drive Boston→Montréal, gas + tolls RT",
      hotelNights:3, hotelRate:145, hotel:435,
      foodPerDay:65, foodDays:3, food:195,
      localXport:20, localNote:"Montréal metro is excellent and cheap",
      passMin:62, passMax:80,
      subtotal:740, totalMin:802, totalMax:820,
      eventNote:"Montréal hotel rates ~20% below comparable US cities; great value",
    },
  },
  {
    id:15, year:2026, past:false,
    name:"Camp Jitterbug", dates:"May 22–25", month:5, day:22,
    style:"Lindy", region:"West Coast", city:"Seattle, WA",
    price:"$209–309", travel:"~$830 (fly)", driveable:false,
    ticketStatus:"Open", ticketNote:"$269–309 tiered; first 100 sold out. Competitor Pass $209. 2026 = Savoy Ballroom 100th anniversary!",
    url:"https://www.campjitterbug.com", type:"Festival",
    description:"2026 celebrates the Savoy Ballroom's 100th anniversary with legends Sugar Sullivan, Barbara Billups, and Chester Whitmore. Jump Session show at Benaroya Hall.",
    workshop:5, social:5, comp:4, ageMatch:4, levelMatch:5,
    ageNote:"Savoy 100th will draw serious 30–55 crowd; Pacific NW Lindy community is mature and dedicated",
    levelNote:"Top-tier instructors and anniversary theme draw the best dancers; floor quality is exceptional",
    daysOff:2, restDay:false, ptoTotal:2, ptoNote:"Fri 22, Mon 25 (May 25 = Memorial Day — may be paid holiday)",
    conflicts:[13,14],
    costs:{
      transport:325, tType:"fly", tNote:"BOS→SEA RT economy",
      hotelNights:3, hotelRate:170, hotel:510,
      foodPerDay:70, foodDays:3, food:210,
      localXport:65, localNote:"Link Light Rail from SeaTac + Uber to venue",
      passMin:209, passMax:309,
      subtotal:1110, totalMin:1319, totalMax:1419,
      eventNote:"Seattle light rail is cheap airport transfer; Savoy 100th adds booking urgency",
    },
  },
  {
    id:16, year:2026, past:false,
    name:"Jack & Jill O'Rama", dates:"Jun 4–8", month:6, day:4,
    style:"WCS", region:"West Coast", city:"Garden Grove, CA",
    price:"$190", travel:"~$800 (fly)", driveable:false,
    ticketStatus:"Open", ticketNote:"$190 flat. Capped at 600 passes.",
    url:"https://jackandjillorama.com", type:"Convention",
    description:"Most J&J divisions of any WCS event. RAINBOW'Rama LGBTQIA room, Country Swing room, Disney Day. Near Disneyland. Capped at 600.",
    workshop:4, social:4, comp:4, ageMatch:3, levelMatch:3,
    ageNote:"WCS convention with Disney Day theme; draws mixed ages; some younger college-WCS crowd",
    levelNote:"All levels from Newcomer to Champion; capped size helps floor quality but diluted",
    daysOff:3, restDay:false, ptoTotal:3, ptoNote:"Thu 4, Fri 5, Mon 8 (ends Monday — fly home Mon)",
    conflicts:[],
    costs:{
      transport:360, tType:"fly", tNote:"BOS→SNA/LAX RT economy",
      hotelNights:4, hotelRate:150, hotel:600,
      foodPerDay:70, foodDays:4, food:280,
      localXport:60, localNote:"Uber from LAX; Anaheim/Garden Grove walkable area",
      passMin:190, passMax:190,
      subtotal:1300, totalMin:1490, totalMax:1490,
      eventNote:"SNA (John Wayne/Orange County) is closer + cheaper than LAX for this venue",
    },
  },
  {
    id:17, year:2026, past:false,
    name:"Liberty Swing Dance Championships", dates:"Jun 25–28", month:6, day:25,
    style:"WCS", region:"Mid-Atlantic", city:"New Brunswick, NJ",
    price:"$185–210", travel:"Driveable (~4.5 hrs)", driveable:true,
    ticketStatus:"Open", ticketNote:"$25,000 in cash & prizes. $180 intl combo w/ Wild Wild Westie.",
    url:"https://libertyswing.com", type:"Convention",
    description:"$25,000 in cash & prizes. Gender-neutral competitions. Premier East Coast WCS event.",
    workshop:4, social:4, comp:5, ageMatch:4, levelMatch:4,
    ageNote:"East Coast WCS competition crowd, 28–50; serious money brings serious adult competitors",
    levelNote:"$25K prize pool means Adv/All-Star heavy; top East Coast WCS community shows up",
    daysOff:2, restDay:false, ptoTotal:2, ptoNote:"Thu 25, Fri 26 (NJ ~4.5 hrs — leave 4pm Sunday, home by 8:30pm, no rest day needed)",
    conflicts:[18,19,20,21],
    costs:{
      transport:92, tType:"drive", tNote:"~4.5 hr drive Boston→New Brunswick NJ, gas + tolls RT",
      hotelNights:3, hotelRate:175, hotel:525,
      foodPerDay:65, foodDays:3, food:195,
      localXport:20, localNote:"Convention hotel, walkable to venue",
      passMin:185, passMax:210,
      subtotal:832, totalMin:1017, totalMax:1042,
      eventNote:"NJ Turnpike tolls add up; E-ZPass saves ~$15 RT",
    },
  },
  {
    id:18, year:2026, past:false,
    name:"Beantown Camp", dates:"Jun 25–Jul 2", month:6, day:25,
    style:"Lindy", region:"New England", city:"Easton, MA",
    price:"$663–$843", travel:"Driveable (<1 hr)", driveable:true,
    ticketStatus:"Open", ticketNote:"Registration opened April 4, 2026 at 1pm EDT. Full week with housing: $663–$843 depending on room type. First-timers: $470–$531. Day/dance passes also available from $263. Stonehill College, Easton MA.",
    url:"https://www.beantowncamp.com", type:"Camp",
    description:"28th year at new venue Stonehill College, Easton MA. All-inclusive residential camp. 5 nights of live music. Special guests Sugar Sullivan and Barbara Billups. Solo Jazz and Mix & Match Mashup competitions. Late night Blues dance.",
    workshop:5, social:5, comp:3, ageMatch:4, levelMatch:4,
    ageNote:"28-yr legacy camp; returning community skews 28–48; price point filters younger crowd",
    levelNote:"Strong Int/Adv backbone from returning regulars; price and reputation attract dedicated dancers",
    daysOff:6, restDay:false, ptoTotal:6, ptoNote:"Thu 25, Fri 26, Mon 29, Tue 30, Wed Jul 1, Thu Jul 2 (local — no rest day)",
    conflicts:[17,19,20,21],
    costs:{
      transport:15, tType:"drive", tNote:"~45 min drive from Boston area→Easton MA (Stonehill College)",
      hotelNights:0, hotelRate:0, hotel:0,
      foodPerDay:0, foodDays:0, food:0,
      localXport:0, localNote:"Residential camp — housing + all meals included in pass",
      campIncludes:"Housing + all meals + workshops + 5 nights live music",
      passMin:663, passMax:843,
      subtotal:15, totalMin:678, totalMax:858,
      eventNote:"Registration opened Apr 4 — register today. Full week with housing & meals runs $663–$843. Best value per day of any event in the calendar.",
    },
  },
  {
    id:19, year:2026, past:false,
    name:"Oxford Lindy Exchange", dates:"Jun (TBC)", month:6, day:20,
    style:"Lindy", region:"Europe", city:"Oxford, UK",
    price:"TBD", travel:"~$1,000 (fly)", driveable:false,
    ticketStatus:"TBD", ticketNote:"2026 dates TBC. Sold out last 3 editions — watch for announcement.",
    url:"https://oxfordlindyexchange.com", type:"Exchange",
    description:"Historic Randolph Hotel ballroom. Sold out last 3 editions. Live swing and blues bands. Air-conditioned. Not-for-profit, volunteer-run.",
    workshop:2, social:5, comp:0, ageMatch:4, levelMatch:4,
    ageNote:"UK/European exchange culture; 26–44 dominant; not-for-profit vibe attracts dedicated community",
    levelNote:"Sold-out exchange self-selects; strong Int/Adv but not an all-star showcase event",
    daysOff:1, restDay:true, ptoTotal:2, ptoNote:"~1 weekday + Mon rest day (international — plan extra travel days)",
    conflicts:[17,18],
    costs:{
      transport:850, tType:"fly", tNote:"BOS→LHR RT economy",
      hotelNights:2, hotelRate:215, hotel:430,
      foodPerDay:90, foodDays:2, food:180,
      localXport:50, localNote:"Train Heathrow→Oxford (~£25 RT)",
      passMin:70, passMax:100,
      subtotal:1510, totalMin:1580, totalMax:1610,
      eventNote:"Oxford exchange pass is cheap; hotel/flight is the cost — consider London as base",
    },
  },
  {
    id:20, year:2026, past:false,
    name:"Wild Wild Westie", dates:"Jul 2–5", month:7, day:2,
    style:"WCS", region:"South", city:"Dallas, TX",
    price:"~$159+", travel:"~$690 (fly)", driveable:false,
    ticketStatus:"Open", ticketNote:"~$159 standard. Intl combo pass w/ Liberty Swing available.",
    url:"https://www.wildwildwestie.com", type:"Convention",
    description:"5 workshop levels, 25+ hours of workshops, 12+ hours of social. Free beginner Project Swing bootcamp.",
    workshop:4, social:4, comp:3, ageMatch:3, levelMatch:3,
    ageNote:"Texas WCS crowd; good mix but free beginner bootcamp brings in newer/younger dancers",
    levelNote:"5 workshop levels means wide spread; good Adv showing but floor is mixed",
    daysOff:2, restDay:true, ptoTotal:3, ptoNote:"Thu 2, Fri 3 + Mon rest day (Jul 4 = holiday; flight from Dallas)",
    conflicts:[17,18,21,22,23],
    costs:{
      transport:250, tType:"fly", tNote:"BOS→DFW RT economy",
      hotelNights:3, hotelRate:145, hotel:435,
      foodPerDay:60, foodDays:3, food:180,
      localXport:50, localNote:"Uber DFW to Irving/Las Colinas venue area",
      passMin:159, passMax:180,
      subtotal:915, totalMin:1074, totalMax:1095,
      eventNote:"Dallas hotels reasonable; July 4th week means book flights early",
    },
  },
  {
    id:21, year:2026, past:false,
    name:"ILHC World Finals", dates:"Jul 2–5", month:7, day:2,
    style:"Lindy", region:"Canada", city:"Montréal, QC",
    price:"$230–360", travel:"Driveable (~5 hrs)", driveable:true,
    ticketStatus:"Open", ticketNote:"$259–302 tiered; early birds sold out. Patron $360. NEW: Montréal 2026 coinciding with Jazz Festival!",
    url:"https://ilhc.com", type:"Competition",
    description:"The premier international Lindy Hop competition. NEW: Montréal 2026, coinciding with Montréal Jazz Festival. Divisions from Newcomer through Champion.",
    workshop:4, social:4, comp:5, ageMatch:4, levelMatch:5,
    ageNote:"World-championship Lindy crowd; 25–42 dominant; international competitive community is adult-serious",
    levelNote:"Highest skill density of any Lindy Hop event — world champions and top competitors on the social floor",
    daysOff:2, restDay:true, ptoTotal:3, ptoNote:"Thu 2, Fri 3 + Mon rest day (~5 hr drive back from Montréal Sunday Jul 5)",
    conflicts:[17,18,20,22,23],
    costs:{
      transport:90, tType:"drive", tNote:"~5 hr drive Boston→Montréal, gas + tolls RT",
      hotelNights:3, hotelRate:145, hotel:435,
      foodPerDay:65, foodDays:3, food:195,
      localXport:30, localNote:"Montréal metro + Uber to venue",
      passMin:259, passMax:360,
      subtotal:750, totalMin:1009, totalMax:1110,
      eventNote:"ILHC is the priciest pass in the guide; Jazz Fest overlap means hotels book fast — plan early",
    },
  },
  {
    id:22, year:2026, past:false,
    name:"Herräng Dance Camp", dates:"Jul 4–31 (4 weeks)", month:7, day:4,
    style:"Lindy", region:"Europe", city:"Herräng, Sweden",
    price:"€450–600/wk", travel:"~$1,030 (fly)", driveable:false,
    ticketStatus:"Open", ticketNote:"~€450–600/week. Accommodation extra. Book early — weeks sell out.",
    url:"https://www.herrang.com", type:"Camp",
    description:"The most legendary swing event in the world (since 1982). 70+ nationalities. 24/7 dancing, live music, history lectures, themed parties.",
    workshop:5, social:5, comp:3, ageMatch:3, levelMatch:4,
    ageNote:"Truly international — teens through 60s; Weeks 3 & 4 tend to draw more advanced/older crowd",
    levelNote:"Strong Int/Adv especially in later weeks; choose your week for the best floor",
    daysOff:5, restDay:false, ptoTotal:5, ptoNote:"5 weekdays per week attended (Mon–Fri); multiply by weeks attended",
    conflicts:[20,21,23],
    costs:{
      transport:950, tType:"fly", tNote:"BOS→ARN RT economy",
      hotelNights:0, hotelRate:0, hotel:0,
      foodPerDay:0, foodDays:0, food:0,
      localXport:30, localNote:"Bus Stockholm→Herräng ~$14; extra snacks ~$16",
      campIncludes:"Accommodation + all meals + 24/7 live music (per week)",
      passMin:490, passMax:660,
      subtotal:980, totalMin:1470, totalMax:1640,
      eventNote:"All-inclusive per week; multiply for multiple weeks. Flight is the main trip cost.",
    },
  },
  {
    id:23, year:2026, past:false,
    name:"Slow Dance Soirée", dates:"Jul 10–12", month:7, day:10,
    style:"Lindy", region:"Northeast", city:"Rochester, NY",
    price:"$199–235", travel:"Driveable (~5.5 hrs)", driveable:true,
    ticketStatus:"Open", ticketNote:"$199 early bird → $225 → $235 door. Danny Jonokuchi & the Revisionists.",
    url:"https://www.slowdancesoiree.com", type:"Weekend Event",
    description:"Unique event focused entirely on slow jazz music. Slow Lindy Hop, Slow Balboa, Blues. Short Showcase & Slow Dance Mix & Match comps. Memorial Art Gallery.",
    workshop:4, social:4, comp:3, ageMatch:4, levelMatch:4,
    ageNote:"Niche slow jazz event; 28–48 skew; slow dance focus self-selects out impatient younger crowd",
    levelNote:"Curated niche — slow dancing rewards experience; predominantly Int/Adv on the floor",
    daysOff:1, restDay:true, ptoTotal:2, ptoNote:"Fri 10 + Mon rest day (~5.5 hr drive back from Rochester Sunday)",
    conflicts:[20,21,22],
    costs:{
      transport:99, tType:"drive", tNote:"~5.5 hr drive Boston→Rochester, gas + tolls RT",
      hotelNights:2, hotelRate:115, hotel:230,
      foodPerDay:60, foodDays:2, food:120,
      localXport:0, localNote:"Memorial Art Gallery area is walkable from hotels",
      passMin:199, passMax:235,
      subtotal:449, totalMin:648, totalMax:684,
      eventNote:"Rochester is one of the best value destinations — cheap hotels, easy drive",
    },
  },
  {
    id:24, year:2026, past:false,
    name:"Uptown Swingout", dates:"Aug 28–30", month:8, day:28,
    style:"Lindy", region:"Midwest", city:"Minneapolis, MN",
    price:"$120–220", travel:"~$690 (fly)", driveable:false,
    ticketStatus:"Open", ticketNote:"$220 full pass; $120 dance pass. Lineup: Skye & Frida, Nils & Bianca, Peter Strom & Naomi Uyama, Sylvia Sykes.",
    url:"https://www.uptownswingout.com", type:"Weekend Event",
    description:"Outstanding 2026 lineup: Skye & Frida, Nils & Bianca, Peter Strom & Naomi Uyama, Sylvia Sykes, Felipe & Dee, Sugar Sullivan, Barbara Billups. Naomi & Her Handsome Devils live.",
    workshop:5, social:4, comp:0, ageMatch:4, levelMatch:5,
    ageNote:"Instructor lineup at this caliber attracts serious 28–48 community; Minneapolis scene is mature",
    levelNote:"This instructor roster pulls the best dancers in North America — floor quality is elite",
    daysOff:1, restDay:true, ptoTotal:2, ptoNote:"Fri 28 + Mon rest day (flight to Minneapolis)",
    conflicts:[27,28,29,30],
    costs:{
      transport:230, tType:"fly", tNote:"BOS→MSP RT economy",
      hotelNights:2, hotelRate:145, hotel:290,
      foodPerDay:60, foodDays:2, food:120,
      localXport:40, localNote:"Blue Line light rail from MSP airport",
      passMin:120, passMax:220,
      subtotal:680, totalMin:800, totalMax:900,
      eventNote:"Minneapolis is affordable for a major city; Uptown area has good hotel options",
    },
  },
  {
    id:25, year:2026, past:false,
    name:"Swing Fling", dates:"Aug 6–9", month:8, day:6,
    style:"WCS", region:"Mid-Atlantic", city:"Dulles, VA",
    price:"$200–225", travel:"Driveable (~7.5 hrs)", driveable:true,
    ticketStatus:"TBD", ticketNote:"Dance Jam Productions (MADjam team). 2026 pricing TBA.",
    url:"https://dancejamproductions.com", type:"Convention",
    description:"Produced by Dance Jam Productions (MADjam team). Full WSDC J&J, Strictly, Rising Star. Summer DC-area WCS event.",
    workshop:4, social:4, comp:4, ageMatch:4, levelMatch:4,
    ageNote:"DC WCS comp crowd; same demographic as MADjam, 28–50; summer timing aids dedicated hobbyists",
    levelNote:"MADjam-adjacent community shows up; solid Adv/All-Star floor density",
    daysOff:2, restDay:true, ptoTotal:3, ptoNote:"Thu 6, Fri 7 + Mon rest day (~7.5 hr drive back Sunday from Dulles)",
    conflicts:[26],
    costs:{
      transport:136, tType:"drive", tNote:"~7.5 hr drive, gas + tolls RT (I-95)",
      hotelNights:3, hotelRate:185, hotel:555,
      foodPerDay:70, foodDays:3, food:210,
      localXport:20, localNote:"Same DJP hotel block as MADjam (Hyatt Regency Dulles)",
      passMin:200, passMax:225,
      subtotal:921, totalMin:1121, totalMax:1146,
      eventNote:"Book DJP event hotel block; same venue as DCSX — potential multi-event deal",
    },
  },
  {
    id:26, year:2026, past:false,
    name:"Express Track Blues", dates:"Aug 15–17", month:8, day:15,
    style:"Blues", region:"Northeast", city:"New York City, NY",
    price:"$190", travel:"Driveable (~4 hrs)", driveable:true,
    ticketStatus:"TBD", ticketNote:"$190 full pass. Blues Dance NY's Sweet 16! Saturday Blues BBQ Festival (free, outdoor).",
    url:"https://www.expresstrackblues.com", type:"Weekend Event",
    description:"NYC's primary blues dance weekend — Blues Dance New York's Sweet 16! Kara Fabrina and Jenny Sowden. Saturday Blues BBQ Festival (free, outdoor). DJ Battle Sunday.",
    workshop:4, social:4, comp:2, ageMatch:4, levelMatch:4,
    ageNote:"NYC blues community skews 27–44; city demographic naturally mature and culturally engaged",
    levelNote:"Explicitly intermediate-focused programming; Int/Adv dominant",
    daysOff:1, restDay:false, ptoTotal:1, ptoNote:"Mon 17 only (event Sat–Mon; Mon is return drive day ~4 hrs NYC → Boston)",
    conflicts:[25,27],
    costs:{
      transport:120, tType:"drive", tNote:"~4 hr drive, gas + tolls + NYC parking RT",
      hotelNights:2, hotelRate:275, hotel:550,
      foodPerDay:80, foodDays:2, food:160,
      localXport:30, localNote:"Subway MetroCard; park outer Brooklyn to avoid Manhattan rates",
      passMin:190, passMax:190,
      subtotal:860, totalMin:1050, totalMax:1050,
      eventNote:"NYC weekend hotels are brutal; outer Brooklyn saves $60-80/night vs Manhattan",
    },
  },
  {
    id:27, year:2026, past:false,
    name:"Summer Hummer", dates:"Aug 20–24", month:8, day:20,
    style:"WCS", region:"New England", city:"Woburn, MA",
    price:"~$180–220", travel:"Driveable (<1 hr)", driveable:true,
    ticketStatus:"TBD", ticketNote:"Boston's own WSDC Registry & NASDE Tour stop. 2026 pricing TBD.",
    url:"https://summerhummerboston.com", type:"Convention",
    description:"Boston's WCS event at Crowne Plaza Woburn. WSDC Registry + NASDE Tour. Full comp schedule: Newcomer through Champions J&J, Strictly, Pro-Am.",
    workshop:4, social:4, comp:4, ageMatch:3, levelMatch:3,
    ageNote:"Regional NE WCS; good 28–48 core but NASDE/Newcomer draws attract broader age range",
    levelNote:"All levels from Newcomer to Champion; good advanced floor during comps but mixed social",
    daysOff:3, restDay:false, ptoTotal:3, ptoNote:"Thu 20, Fri 21, Mon 24 (Boston area — local, no rest day)",
    conflicts:[24,26,28,29],
    costs:{
      transport:0, tType:"local", tNote:"Local — venue is in the Boston area",
      hotelNights:0, hotelRate:0, hotel:0,
      foodPerDay:70, foodDays:4, food:280,
      localXport:0, localNote:"Walk or 5-min drive",
      passMin:180, passMax:220,
      subtotal:280, totalMin:460, totalMax:500,
      eventNote:"Best deal of the year: world-class WCS in your backyard",
    },
  },
  {
    id:28, year:2026, past:false,
    name:"Swing Out New Hampshire", dates:"Aug 26–31", month:8, day:26,
    style:"Lindy", region:"New England", city:"Hebron, NH",
    price:"$700–900+", travel:"Driveable (~2 hrs)", driveable:true,
    ticketStatus:"TBD", ticketNote:"26th year. Registration TBA. ~$700–900 all-in. Historically sells out.",
    url:"https://www.swingoutnh.com", type:"Camp",
    description:"26th year at Camp Wicosuta in the Lakes Region. Full summer-camp immersion: cabins, dining, lake, pool, campfire. 8 tracked + 40 optional classes. Gordon Webster Band.",
    workshop:5, social:5, comp:0, ageMatch:4, levelMatch:4,
    ageNote:"26-yr legacy camp; returning community core is 28–48; all-inclusive price filters out casual crowd",
    levelNote:"Leveled tracks ensure good Int/Adv cohorts; returning community is dedicated and experienced",
    daysOff:4, restDay:false, ptoTotal:4, ptoNote:"Wed 26, Thu 27, Fri 28, Mon 31 (ends Monday; Hebron NH ~2 hrs — no rest day)",
    conflicts:[24,27,29,30],
    costs:{
      transport:31, tType:"drive", tNote:"~2 hr drive from Boston area→Hebron NH, gas (no tolls) RT",
      hotelNights:0, hotelRate:0, hotel:0,
      foodPerDay:0, foodDays:0, food:0,
      localXport:0, localNote:"Camp Wicosuta all-inclusive",
      campIncludes:"Cabin + all meals + 6 nights live music + workshops",
      passMin:700, passMax:900,
      subtotal:31, totalMin:731, totalMax:931,
      eventNote:"Near-local camp — gas is the only non-pass cost",
    },
  },
  {
    id:29, year:2026, past:false,
    name:"Desert City Swing", dates:"Aug 27–30", month:8, day:27,
    style:"WCS", region:"West", city:"Phoenix, AZ",
    price:"$175–200", travel:"~$720 (fly)", driveable:false,
    ticketStatus:"Open", ticketNote:"Resort convention at Arizona Grand Resort (7-acre water park).",
    url:"https://desertcityswing.com", type:"Convention",
    description:"Arizona Grand Resort with 7-acre water park and wave pool. WSDC Registry. Dance + vacation hybrid with top pro instructors.",
    workshop:4, social:4, comp:3, ageMatch:3, levelMatch:3,
    ageNote:"Resort/vacation atmosphere; 30–55 but leisure vibe dilutes the serious community feel",
    levelNote:"Solid WCS pros attend but resort setting brings casual dancers; mixed floor",
    daysOff:2, restDay:true, ptoTotal:3, ptoNote:"Thu 27, Fri 28 + Mon rest day (flight from Phoenix)",
    conflicts:[24,27,28,30],
    costs:{
      transport:280, tType:"fly", tNote:"BOS→PHX RT economy",
      hotelNights:3, hotelRate:195, hotel:585,
      foodPerDay:65, foodDays:3, food:195,
      localXport:30, localNote:"Resort on-site; Uber to PHX airport",
      passMin:175, passMax:200,
      subtotal:1090, totalMin:1265, totalMax:1290,
      eventNote:"Arizona Grand is pricier than convention hotels; offset by water park amenities",
    },
  },
  {
    id:30, year:2026, past:false,
    name:"Camp Hollywood (NJC)", dates:"Sep 3–7", month:9, day:3,
    style:"Lindy", region:"West Coast", city:"Los Angeles, CA",
    price:"$45–275", travel:"~$830 (fly)", driveable:false,
    ticketStatus:"Open", ticketNote:"$275 supporter (250 tickets). Individual nights $45–55. 28th edition. Book ASAP.",
    url:"https://camphollywood.net", type:"Festival",
    description:"28th edition Labor Day classic. National Jitterbug Championships. Jonathan Stout Orchestra + Hilary Alexander, Michael Gamble & Rhythm Serenaders. Pool party, vintage vendors.",
    workshop:5, social:5, comp:5, ageMatch:5, levelMatch:5,
    ageNote:"The vintage swing community pillar event; 30–55 dominant; deeply mature, serious dancer culture",
    levelNote:"National Jitterbug Championships — the best Lindy Hop, Balboa, and Shag dancers in America are here",
    daysOff:3, restDay:false, ptoTotal:3, ptoNote:"Thu 3, Fri 4, Mon 7 (Mon 7 = Labor Day — may be paid holiday)",
    conflicts:[24,28,29],
    costs:{
      transport:360, tType:"fly", tNote:"BOS→LAX RT economy",
      hotelNights:4, hotelRate:165, hotel:660,
      foodPerDay:75, foodDays:4, food:300,
      localXport:60, localNote:"Uber LAX to Culver City/venue area (~$35 each way)",
      passMin:200, passMax:275,
      subtotal:1380, totalMin:1580, totalMax:1655,
      eventNote:"Camp Hollywood is in Culver City; LAX-area hotels better value than Hollywood proper",
    },
  },
  {
    id:31, year:2026, past:false,
    name:"Lindy on the Rocks", dates:"Sep 18–20", month:9, day:18,
    style:"Lindy", region:"West", city:"Denver, CO",
    price:"$199–349", travel:"~$720 (fly)", driveable:false,
    ticketStatus:"Open", ticketNote:"$249 standard → $289/$319/$349 tiered. Dance Pass $199. Runs w/ Hot Night Fusion + Denver Jazz Festival.",
    url:"https://www.cmdance.org", type:"Weekend Event",
    description:"22nd year. Concurrent with Hot Night Fusion and Denver Jazz Festival — all-access covers all three. Live vintage jazz. Competition finals.",
    workshop:4, social:4, comp:3, ageMatch:3, levelMatch:3,
    ageNote:"Denver swing community is broad; Fusion crossover brings adjacent dance crowd; mixed ages",
    levelNote:"22yr track record brings reliable Int/Adv showing; Fusion overlap introduces mixed skill floor",
    daysOff:1, restDay:true, ptoTotal:2, ptoNote:"Fri 18 + Mon rest day (flight from Denver)",
    conflicts:[32,33],
    costs:{
      transport:240, tType:"fly", tNote:"BOS→DEN RT economy",
      hotelNights:2, hotelRate:155, hotel:310,
      foodPerDay:65, foodDays:2, food:130,
      localXport:40, localNote:"RTD light rail from DEN airport to downtown Denver",
      passMin:199, passMax:349,
      subtotal:720, totalMin:919, totalMax:1069,
      eventNote:"Denver has good airport transit; all-access pass covers Hot Night Fusion + Jazz Festival too",
    },
  },
  {
    id:32, year:2026, past:false,
    name:"Rhythm Shuffle", dates:"Sep 18–20", month:9, day:18,
    style:"Lindy", region:"Northeast", city:"Buffalo, NY",
    price:"$100–175", travel:"Driveable (~7 hrs)", driveable:true,
    ticketStatus:"TBD", ticketNote:"$175 weekend pass; $100 single track. 2026 instructors TBA.",
    url:"https://swingbuffalo.com", type:"Weekend Event",
    description:"Organized by Swing Buffalo. Balboa and Lindy focus. 2025 instructors included Sylvia Sykes & Nick Williams.",
    workshop:4, social:3, comp:0, ageMatch:3, levelMatch:3,
    ageNote:"Regional Buffalo scene; decent community base but smaller regional event limits demographic control",
    levelNote:"Balboa focus skews toward experienced niche dancers; Lindy floor more mixed",
    daysOff:1, restDay:true, ptoTotal:2, ptoNote:"Fri 18 + Mon rest day (~7 hr drive back from Buffalo Sunday)",
    conflicts:[31,33],
    costs:{
      transport:128, tType:"drive", tNote:"~7 hr drive Boston→Buffalo, gas + tolls RT",
      hotelNights:2, hotelRate:105, hotel:210,
      foodPerDay:55, foodDays:2, food:110,
      localXport:0, localNote:"Walkable downtown Buffalo venue",
      passMin:100, passMax:175,
      subtotal:448, totalMin:548, totalMax:623,
      eventNote:"Buffalo is the cheapest driveable destination; hotels reliably under $110/night",
    },
  },
  {
    id:33, year:2026, past:false,
    name:"Dirty Water Lindy Exchange", dates:"Sep (TBD)", month:9, day:25,
    style:"Lindy", region:"New England", city:"Cambridge/Boston, MA",
    price:"$25–45/dance", travel:"Driveable (<1 hr)", driveable:true,
    ticketStatus:"TBD", ticketNote:"Boston Swing Central's exchange. A la carte. Live bands incl. Gordon Webster. Outdoor Piers Park dance.",
    url:"https://www.bostonswingcentral.org", type:"Exchange",
    description:"Boston Swing Central's social exchange. Live bands (Gordon Webster, Taryn Newborne). Outdoor Piers Park dance. No workshops — pure exchange.",
    workshop:0, social:4, comp:0, ageMatch:3, levelMatch:3,
    ageNote:"Boston local scene; city demographics include college dancers; 28–45 core but variable",
    levelNote:"Exchange format helps; local NE community is strong but spread across skill levels",
    daysOff:1, restDay:false, ptoTotal:1, ptoNote:"~Fri (dates TBD; Cambridge/Boston — local, no rest day)",
    conflicts:[31,32,49],
    costs:{
      transport:0, tType:"local", tNote:"Local — Cambridge is nearby",
      hotelNights:0, hotelRate:0, hotel:0,
      foodPerDay:70, foodDays:1, food:70,
      localXport:10, localNote:"Gas + Cambridge street parking",
      passMin:25, passMax:45,
      subtotal:80, totalMin:105, totalMax:125,
      eventNote:"Cheapest event in the calendar — pure social dancing",
    },
  },
  {
    id:34, year:2026, past:false,
    name:"Boogie by the Bay", dates:"Oct 8–11", month:10, day:8,
    style:"WCS", region:"West Coast", city:"Burlingame, CA",
    price:"$170–205", travel:"~$860 (fly)", driveable:false,
    ticketStatus:"Open", ticketNote:"$205 standard ($170 Champion, $185 NextGen). Jordan Frisbee & Tatiana Mollman intensive.",
    url:"https://www.boogiebythebaydance.com", type:"Convention",
    description:"One of the most prestigious WCS events — running 30+ years. 1,500+ dancers, 50+ workshops. Jordan Frisbee & Tatiana Mollman intensive. Saturday red carpet dinner.",
    workshop:5, social:4, comp:5, ageMatch:4, levelMatch:5,
    ageNote:"30-yr WCS prestige event; 30–55 demographic; red carpet dinner culture attracts serious adult dancers",
    levelNote:"Every top WCS All-Star shows up; floor quality rivals The Open; exceptional all-star density",
    daysOff:2, restDay:true, ptoTotal:3, ptoNote:"Thu 8, Fri 9 + Mon 12 rest day (flying back from CA Sunday; Mon 12 = Columbus Day — may be paid holiday)",
    conflicts:[35,37,49],
    costs:{
      transport:380, tType:"fly", tNote:"BOS→SFO RT economy",
      hotelNights:4, hotelRate:190, hotel:760,
      foodPerDay:75, foodDays:4, food:300,
      localXport:60, localNote:"BART SFO→Millbrae; event hotel area walkable",
      passMin:170, passMax:205,
      subtotal:1500, totalMin:1670, totalMax:1705,
      eventNote:"SFO area (Burlingame) has airport hotels with free shuttles — solid value",
    },
  },
  {
    id:35, year:2026, past:false,
    name:"Blues Muse", dates:"Oct 16–18", month:10, day:16,
    style:"Blues", region:"Mid-Atlantic", city:"Philadelphia, PA",
    price:"$225–275", travel:"Driveable (~5.5 hrs)", driveable:true,
    ticketStatus:"Open", ticketNote:"$225 standard / $275 supporter. Sells out quickly. COVID testing required.",
    url:"https://www.bluesmuse.dance", type:"Weekend Event",
    description:"The premier US blues event for partnership dance. Follower voice, leader receptivity, blues aesthetic. BLM commitment. 'Muse-Comer' and Open Mix & Match comps.",
    workshop:5, social:5, comp:3, ageMatch:4, levelMatch:5,
    ageNote:"Culturally serious blues event; 26–46 dominant; community values filter for engaged adult dancers",
    levelNote:"The most advanced blues floor in the US — curated culture means the best blues dancers attend",
    daysOff:1, restDay:true, ptoTotal:2, ptoNote:"Fri 16 + Mon rest day (~5.5 hr drive back from Philly Sunday)",
    conflicts:[34,36,37],
    costs:{
      transport:97, tType:"drive", tNote:"~5.5 hr drive Boston→Philadelphia, gas + tolls RT",
      hotelNights:2, hotelRate:165, hotel:330,
      foodPerDay:65, foodDays:2, food:130,
      localXport:20, localNote:"Philadelphia SEPTA or walkable from most Center City hotels",
      passMin:225, passMax:275,
      subtotal:577, totalMin:802, totalMax:852,
      eventNote:"German Society of PA venue is Center City; book nearby to walk",
    },
  },
  {
    id:36, year:2026, past:false,
    name:"Flying Home", dates:"Oct 23–25", month:10, day:23,
    style:"Lindy", region:"South", city:"Carrboro, NC",
    price:"$100–175", travel:"~$610 (fly)", driveable:false,
    ticketStatus:"TBD", ticketNote:"2026 dates TBD. Hosted by Triangle Swing Dance Society.",
    url:"https://www.swingplanit.com", type:"Weekend Event",
    description:"World-class live bands. Legends of Lindy Hop including David 'Butts' Carne. Two Mix & Match competitions plus fun late-night contests.",
    workshop:4, social:4, comp:3, ageMatch:3, levelMatch:3,
    ageNote:"Triangle/NC scene; college-town area mixes younger crowd with established 30–48 community",
    levelNote:"Live bands attract good Int/Adv; southeastern Lindy scene solid but smaller footprint",
    daysOff:1, restDay:true, ptoTotal:2, ptoNote:"Fri 23 + Mon rest day (flight to RDU — NC is ~12 hrs, over drive limit)",
    conflicts:[35,37,38],
    costs:{
      transport:180, tType:"fly", tNote:"BOS→RDU RT economy",
      hotelNights:2, hotelRate:145, hotel:290,
      foodPerDay:60, foodDays:2, food:120,
      localXport:40, localNote:"Uber RDU to Carrboro/Chapel Hill area",
      passMin:100, passMax:175,
      subtotal:630, totalMin:730, totalMax:805,
      eventNote:"Carrboro is adjacent to Chapel Hill; affordable NC hotel market",
    },
  },
  {
    id:37, year:2026, past:false,
    name:"New York Lindy Exchange", dates:"Oct 9–11", month:10, day:9,
    style:"Lindy", region:"Northeast", city:"New York City, NY",
    price:"$99–520", travel:"Driveable (~4 hrs)", driveable:true,
    ticketStatus:"TBD", ticketNote:"$349–520 full pass; Party Pass $99–109. 4th edition. Conflicts with Boogie by the Bay — same weekend.",
    url:"https://www.nylindy.com", type:"Exchange",
    description:"4th edition. 100% NYC-produced. Historic venues. Gordon Webster + Eyal Vilner Big Band. Dandy Wellington as emcee. Harlem tours.",
    workshop:4, social:5, comp:2, ageMatch:4, levelMatch:4,
    ageNote:"NYC Lindy scene is mature 27–48; urban professional demographic; tiered pricing concentrates serious crowd",
    levelNote:"Strong Int/Adv density; NYC scene self-selects; top-tier full pass holders are very experienced",
    daysOff:1, restDay:false, ptoTotal:1, ptoNote:"~Fri (dates TBD; leave 5pm Sunday, home by 9pm NYC → Boston — no rest day needed)",
    conflicts:[34,35,36],
    costs:{
      transport:120, tType:"drive", tNote:"~4 hr drive, gas + tolls + parking RT",
      hotelNights:2, hotelRate:275, hotel:550,
      foodPerDay:80, foodDays:2, food:160,
      localXport:30, localNote:"Subway; park outer Brooklyn to save $50+/day vs Manhattan",
      passMin:99, passMax:520,
      subtotal:860, totalMin:959, totalMax:1380,
      eventNote:"Party Pass ($99) vs Full Pass ($520) is a huge cost difference; full pass is the real experience",
    },
  },
  {
    id:38, year:2026, past:false,
    name:"Cat's Corner Exchange", dates:"Oct 30–Nov 1", month:10, day:30,
    style:"Multi", region:"Canada", city:"Montréal, QC",
    price:"A la carte", travel:"Driveable (~5 hrs)", driveable:true,
    ticketStatus:"TBD", ticketNote:"Halloween-themed. A la carte/affordable pricing. 2 rooms, 8+ bands including 2 big bands.",
    url:"https://www.swingplanit.com", type:"Exchange",
    description:"Halloween-themed. Music festival for dancers — 2 rooms, 8+ bands including 2 big bands. Vernacular Spectacular programming. Free midnight buffet. All That Jazz battle.",
    workshop:3, social:5, comp:3, ageMatch:4, levelMatch:4,
    ageNote:"Montréal exchange community 27–46; Halloween format adds fun but doesn't skew demographics young",
    levelNote:"8+ bands attract serious dancers from across Canada/NE US; strong Int/Adv showing",
    daysOff:1, restDay:true, ptoTotal:2, ptoNote:"Fri 30 + Mon rest day (~5 hr drive back from Montréal Sunday Nov 1)",
    conflicts:[36,39],
    costs:{
      transport:90, tType:"drive", tNote:"~5 hr drive Boston→Montréal, gas + tolls RT",
      hotelNights:2, hotelRate:145, hotel:290,
      foodPerDay:65, foodDays:2, food:130,
      localXport:20, localNote:"Montréal metro",
      passMin:40, passMax:80,
      subtotal:530, totalMin:570, totalMax:610,
      eventNote:"Halloween weekend; Montréal hotel rates reasonable in late October",
    },
  },
  {
    id:39, year:2026, past:false,
    name:"Track Town Throwdown", dates:"Nov 6–8", month:11, day:6,
    style:"Lindy", region:"West Coast", city:"Eugene, OR",
    price:"$130–200", travel:"~$760 (fly)", driveable:false,
    ticketStatus:"TBD", ticketNote:"$200 Int-Adv; $145 Chorus Line; $130 Beg-Int. 2026 TBA.",
    url:"https://www.swingplanit.com", type:"Weekend Event",
    description:"Founded 2019. Multiple workshop tracks. Live bands. Free downtown outdoor dances. Endorsed by City of Eugene.",
    workshop:3, social:4, comp:3, ageMatch:3, levelMatch:3,
    ageNote:"Pacific NW regional; Eugene has a university town element; 28–45 core but broader attendance",
    levelNote:"Multiple tracks help segment; Int-Adv track solid; outdoor free dances dilute floor density",
    daysOff:1, restDay:true, ptoTotal:2, ptoNote:"Fri 6 + Mon rest day (flight to Eugene)",
    conflicts:[38,40,41,44],
    costs:{
      transport:400, tType:"fly", tNote:"BOS→EUG RT economy (often connects via SEA/PDX)",
      hotelNights:2, hotelRate:120, hotel:240,
      foodPerDay:65, foodDays:2, food:130,
      localXport:40, localNote:"Uber from small Eugene airport; downtown walkable",
      passMin:130, passMax:200,
      subtotal:810, totalMin:940, totalMax:1010,
      eventNote:"Eugene flights are expensive for a small airport; check PDX + drive (~1 hr) as alternative",
    },
  },
  {
    id:40, year:2026, past:false,
    name:"Northeast Swing Classic", dates:"Nov 12–15", month:11, day:12,
    style:"WCS", region:"New England", city:"Warwick, RI",
    price:"$180–210", travel:"Driveable (~1.5 hrs)", driveable:true,
    ticketStatus:"TBD", ticketNote:"WSDC points event, 40+ workshops. ~1.5 hrs from Boston. 2026 pricing TBD.",
    url:"https://www.swingplanit.com", type:"Convention",
    description:"WSDC Points event. 40+ workshops. Thursday pre-party, 4 themed parties, late-night dancing in two rooms. Newcomer weekend pass available.",
    workshop:4, social:4, comp:4, ageMatch:3, levelMatch:3,
    ageNote:"NE regional WCS; good local 28–48 base but regional scale limits top-tier dancer draw",
    levelNote:"Newcomer pass availability indicates mixed levels; decent Adv but not elite floor density",
    daysOff:2, restDay:false, ptoTotal:2, ptoNote:"Thu 12, Fri 13 (Warwick RI ~1.5 hrs — local enough, no rest day needed)",
    conflicts:[39,41,42,44,48],
    costs:{
      transport:17, tType:"drive", tNote:"~1.5 hr drive from Boston area→Warwick RI, gas + tolls RT",
      hotelNights:3, hotelRate:130, hotel:390,
      foodPerDay:60, foodDays:3, food:180,
      localXport:0, localNote:"Hotel convention, all in-venue",
      passMin:180, passMax:210,
      subtotal:587, totalMin:767, totalMax:797,
      eventNote:"Best value-per-PTO-day of any multi-night event; 1.5 hrs from home",
    },
  },
  {
    id:41, year:2026, past:false,
    name:"Austin Lindy Exchange", dates:"Nov 12–15", month:11, day:12,
    style:"Lindy", region:"South", city:"Austin, TX",
    price:"A la carte", travel:"~$720 (fly)", driveable:false,
    ticketStatus:"TBD", ticketNote:"27th edition — one of the longest-running US exchanges. 7 Austin bands. No comps. Affordable community pricing.",
    url:"https://www.swingplanit.com", type:"Exchange",
    description:"27th edition. Seven incredible local Austin bands. No competitions — pure social dancing. Community-focused with coffee bar. One of the oldest US exchanges.",
    workshop:0, social:5, comp:0, ageMatch:4, levelMatch:4,
    ageNote:"27yr exchange community has matured; returning crowd skews 28–48; dedication required to keep attending",
    levelNote:"Pure exchange with no beginner workshops strongly self-selects Int/Adv; 7 live bands reward good dancers",
    daysOff:2, restDay:true, ptoTotal:3, ptoNote:"Thu 12, Fri 13 + Mon rest day (flight to Austin)",
    conflicts:[39,40,42,44,48],
    costs:{
      transport:260, tType:"fly", tNote:"BOS→AUS RT economy",
      hotelNights:3, hotelRate:165, hotel:495,
      foodPerDay:60, foodDays:3, food:180,
      localXport:50, localNote:"Uber AUS airport to 6th Street/downtown area",
      passMin:50, passMax:100,
      subtotal:985, totalMin:1035, totalMax:1085,
      eventNote:"Austin LX has one of the cheapest passes anywhere; most cost is the flight",
    },
  },
  {
    id:42, year:2026, past:false,
    name:"Stompology", dates:"Nov 20–22", month:11, day:20,
    style:"Lindy", region:"Northeast", city:"Rochester, NY",
    price:"TBD", travel:"Driveable (~5.5 hrs)", driveable:true,
    ticketStatus:"TBD", ticketNote:"Original solo jazz dance weekend (since 2006). Tiered pricing — earlier = cheaper. LaTasha Barnes, Viktor Lillard, Ursula Hicks.",
    url:"https://www.stompology.com", type:"Weekend Event",
    description:"The original solo jazz dance weekend (since 2006). LaTasha Barnes, Viktor Lillard, Ursula Hicks. Eyal Vilner Big Band live. Open and Advanced solo jazz competitions.",
    workshop:5, social:4, comp:4, ageMatch:4, levelMatch:5,
    ageNote:"Solo jazz niche draws passionate 28–48 crowd; LaTasha Barnes following is adult/serious community",
    levelNote:"The premiere solo jazz event — floor is overwhelmingly serious advanced dancers; elite instructor pull",
    daysOff:1, restDay:true, ptoTotal:2, ptoNote:"Fri 20 + Mon rest day (~5.5 hr drive back from Rochester Sunday)",
    conflicts:[40,41,43,44,48],
    costs:{
      transport:99, tType:"drive", tNote:"~5.5 hr drive Boston→Rochester, gas + tolls RT",
      hotelNights:2, hotelRate:115, hotel:230,
      foodPerDay:60, foodDays:2, food:120,
      localXport:0, localNote:"Walkable venue area",
      passMin:80, passMax:120,
      subtotal:449, totalMin:529, totalMax:569,
      eventNote:"Stompology is great value — Rochester is cheap and very driveable",
    },
  },
  {
    id:43, year:2026, past:false,
    name:"The Open (WSDC World Championships)", dates:"Nov 25–29", month:11, day:25,
    style:"WCS", region:"West Coast", city:"Burbank, CA",
    price:"$200–250", travel:"~$830 (fly)", driveable:false,
    ticketStatus:"TBD", ticketNote:"$50,000+ in cash & prizes. The Opus trophy. Walk of Legends. Final NASDE tour stop.",
    url:"https://theopenswing.com", type:"Championship",
    description:"The most prestigious swing competition in the world (41+ years). $50,000+ in cash & prizes. The coveted Opus trophy. Walk of Legends inductions. Final NASDE tour stop.",
    workshop:4, social:4, comp:5, ageMatch:4, levelMatch:5,
    ageNote:"World championship draws dedicated adult 30–52 WCS community; $50K prize brings serious competitors",
    levelNote:"The absolute peak of WCS skill density — every All-Star in the world is in this room",
    daysOff:3, restDay:true, ptoTotal:4, ptoNote:"Wed 25, Thu 26 (Thanksgiving—may be paid), Fri 27 + Mon rest day (check your holiday policy)",
    conflicts:[42,48],
    costs:{
      transport:380, tType:"fly", tNote:"BOS→BUR RT economy (Burbank is much closer to venue than LAX)",
      hotelNights:4, hotelRate:165, hotel:660,
      foodPerDay:75, foodDays:4, food:300,
      localXport:60, localNote:"Uber from Burbank Bob Hope Airport (~$20 to venue)",
      passMin:200, passMax:250,
      subtotal:1400, totalMin:1600, totalMax:1650,
      eventNote:"Thanksgiving week: flights spike 40-60% — book months early. BUR vs LAX saves ~1 hr + $40 Uber.",
    },
  },
  {
    id:44, year:2026, past:false,
    name:"PittStop Lindy Hop", dates:"Nov (TBD)", month:11, day:14,
    style:"Lindy", region:"Mid-Atlantic", city:"Pittsburgh, PA",
    price:"$80–100", travel:"~$610 (fly)", driveable:false,
    ticketStatus:"TBD", ticketNote:"25+ year exchange. All live music at every dance. Gordon Webster, Chelsea Reed, Boilermaker Jazz Band. 2026 dates TBD.",
    url:"https://www.swingplanit.com", type:"Exchange",
    description:"One of the longest-running US exchanges (25+ years). All live music at every dance. Gordon Webster, Chelsea Reed, Boilermaker Jazz Band. Beautiful historic Pittsburgh venues.",
    workshop:0, social:5, comp:0, ageMatch:4, levelMatch:5,
    ageNote:"25yr exchange community is mature and dedicated; 28–48 core; not a beginner destination",
    levelNote:"All live music at every dance self-selects the best social dancers; consistently elite floor",
    daysOff:2, restDay:true, ptoTotal:3, ptoNote:"~Thu/Fri + Mon rest day (Pittsburgh ~8.5 hrs, over drive limit — fly)",
    conflicts:[39,40,41,42,48],
    costs:{
      transport:180, tType:"fly", tNote:"BOS→PIT RT economy",
      hotelNights:2, hotelRate:195, hotel:390,
      foodPerDay:60, foodDays:2, food:120,
      localXport:40, localNote:"Uber PIT airport to downtown Pittsburgh",
      passMin:80, passMax:100,
      subtotal:730, totalMin:810, totalMax:830,
      eventNote:"PittStop: one of the best value exchanges — cheap pass, elite floor, beautiful venues",
    },
  },
  {
    id:48, year:2026, past:false,
    name:"DC Swing eXperience (DCSX)", dates:"Nov 19–22", month:11, day:19,
    style:"WCS", region:"Mid-Atlantic", city:"Dulles, VA",
    price:"~$200–225", travel:"Driveable (~7.5 hrs)", driveable:true,
    ticketStatus:"TBD", ticketNote:"Dance Jam Productions (MADjam/Swing Fling team). Hyatt Regency Dulles. ~1,000 dancers. 2026 pricing TBA.",
    url:"https://dcswingexperience.com", type:"Convention",
    description:"Produced by the Dance Jam Productions team (MADjam, Swing Fling). All WSDC J&J divisions, Strictly, Rising Star. 7,500 sq ft hardwood floors. DC's November WCS event.",
    workshop:4, social:4, comp:4, ageMatch:4, levelMatch:4,
    ageNote:"Same DJP crowd as MADjam; 28–50 WCS community; November timing draws dedicated hobbyists",
    levelNote:"DJP events consistently draw strong Adv/All-Star field; MADjam regulars show up",
    daysOff:2, restDay:true, ptoTotal:3, ptoNote:"Thu 19, Fri 20 + Mon rest day (~7.5 hr drive back from Dulles Sunday)",
    conflicts:[40,41,42,43,44],
    costs:{
      transport:136, tType:"drive", tNote:"~7.5 hr drive, gas + tolls RT (I-95)",
      hotelNights:3, hotelRate:185, hotel:555,
      foodPerDay:70, foodDays:3, food:210,
      localXport:20, localNote:"Same DJP hotel block as MADjam + Swing Fling (Hyatt Regency Dulles)",
      passMin:200, passMax:225,
      subtotal:921, totalMin:1121, totalMax:1146,
      eventNote:"Third DJP event at same DC venue — same drive + hotel block",
    },
  },
  {
    id:45, year:2026, past:false,
    name:"The Snowball", dates:"Dec 26–31", month:12, day:26,
    style:"Multi", region:"Europe", city:"Solna (Stockholm), Sweden",
    price:"€390–420", travel:"~$1,030 (fly)", driveable:false,
    ticketStatus:"Open", ticketNote:"~€390–420. NYE included. Skye & Frida, Naomi & Peter, Nils & Bianca, Chester Whitmore. Sells out every year.",
    url:"https://www.thesnowball.se", type:"Festival",
    description:"Europe's premier year-end swing event. 6 nights of dancing, 3 simultaneous floors, 5-day workshop, NYE party. Skye & Frida, Naomi & Peter, Nils & Bianca, Chester Whitmore.",
    workshop:5, social:5, comp:3, ageMatch:4, levelMatch:5,
    ageNote:"European advanced Lindy community; 26–44 dominant; transatlantic pilgrimage weeds out casual crowd",
    levelNote:"European elite Lindy scene at its densest — exceptional floor quality, multiple rooms of advanced dancers",
    daysOff:4, restDay:false, ptoTotal:4, ptoNote:"Mon 28, Tue 29, Wed 30, Thu 31 (holiday week; Fri Jan 1 = NY's Day holiday)",
    conflicts:[46,47],
    costs:{
      transport:950, tType:"fly", tNote:"BOS→ARN RT economy",
      hotelNights:5, hotelRate:205, hotel:1025,
      foodPerDay:90, foodDays:5, food:450,
      localXport:40, localNote:"Stockholm T-bana to Solna; day pass ~$10",
      passMin:425, passMax:460,
      subtotal:2465, totalMin:2890, totalMax:2925,
      eventNote:"Stockholm is expensive — hotel is biggest line item. Book Dec dates very early.",
    },
  },
  {
    id:46, year:2026, past:false,
    name:"Lindy Focus", dates:"Dec 26–Jan 1", month:12, day:26,
    style:"Lindy", region:"South", city:"Asheville, NC",
    price:"$200–400", travel:"~$690 (fly)", driveable:false,
    ticketStatus:"TBD", ticketNote:"~$350–400 all-class pass; $200–250 dance pass. Full hotel takeover at Crowne Plaza Resort.",
    url:"https://www.lindyfocus.com", type:"Camp",
    description:"The premier US swing dance camp. Full hotel takeover at Crowne Plaza Resort. 5 nights of live big band music. 100+ hrs of social dancing. NYE party.",
    workshop:5, social:5, comp:4, ageMatch:4, levelMatch:5,
    ageNote:"THE US Lindy pilgrimage; serious community 28–50; price and reputation mean only dedicated dancers attend",
    levelNote:"Alongside DCLX, the best social Lindy floor in the US — returning community of dedicated advanced dancers",
    daysOff:4, restDay:false, ptoTotal:4, ptoNote:"Mon 28, Tue 29, Wed 30, Thu 31 (holiday week; Jan 1 = New Year's holiday)",
    conflicts:[45,47],
    costs:{
      transport:200, tType:"fly", tNote:"BOS→AVL/CLT RT economy",
      hotelNights:6, hotelRate:160, hotel:960,
      foodPerDay:60, foodDays:6, food:360,
      localXport:30, localNote:"Hotel takeover; Crowne Plaza is the venue — fully walkable",
      passMin:200, passMax:400,
      subtotal:1550, totalMin:1750, totalMax:1950,
      eventNote:"Book the event hotel block (Crowne Plaza Asheville) for best rates. Dec 26-Jan 1 = 6 nights.",
    },
  },
  {
    id:47, year:2026, past:false,
    name:"Countdown Swing Boston", dates:"Dec 31–Jan 3", month:12, day:31,
    style:"WCS", region:"New England", city:"Mansfield, MA",
    price:"TBD", travel:"Driveable (~50 min — hotel needed)", driveable:true,
    ticketStatus:"TBD", ticketNote:"WSDC Registry. Boston's NYE WCS event. NYE dinner add-on available.",
    url:"https://www.swingplanit.com", type:"Convention",
    description:"Boston's NYE WCS event. WSDC Registry. Full J&J divisions, Strictly, Pro-Am, Role Switch. NYE dinner available as add-on.",
    workshop:3, social:4, comp:3, ageMatch:3, levelMatch:3,
    ageNote:"Local NE WCS NYE event; fun mixed crowd; NYE format broadens demographic",
    levelNote:"Regional level; solid local dancers but not a destination for elite floor density",
    daysOff:1, restDay:false, ptoTotal:1, ptoNote:"Thu 31 (Jan 1 = New Year's holiday; multi-night event Dec 31–Jan 3 — hotel stay needed at ~50 min from Boston area)",
    conflicts:[45,46],
    costs:{
      transport:14, tType:"drive", tNote:"~50 min drive from Boston area→Mansfield, gas RT",
      hotelNights:3, hotelRate:140, hotel:420,
      foodPerDay:60, foodDays:3, food:180,
      localXport:0, localNote:"Convention hotel — venue is on-site or walking distance",
      passMin:70, passMax:90,
      subtotal:614, totalMin:684, totalMax:704,
      eventNote:"Mansfield is ~50 min from Boston area — over the no-hotel threshold. Foxborough/Mansfield area hotels run $130–150/night. NYE rates may be higher — book early.",
    },
  },

  {
    id:49, year:2026, past:false,
    name:"Blues Experiment", dates:"TBD (week-long camp)", month:10, day:1,
    style:"Blues", region:"South", city:"North Carolina",
    price:"TBD", travel:"~$610 (fly)", driveable:false,
    ticketStatus:"TBD", ticketNote:"Week-long blues dance camp. Dates unconfirmed — research suggests this event may run in spring (Mar/Apr) rather than Oct. Watch Blues Dance community channels for 2026/2027 announcement.",
    url:"https://www.thebluesexperiment.com", type:"Camp",
    description:"Week-long immersive blues dance camp in North Carolina. Modeled after Lindy camp formats — all-inclusive, residential, focused exclusively on blues. Historically intimate and high-skill. Watch for 2026 announcement.",
    workshop:5, social:5, comp:1, ageMatch:4, levelMatch:5,
    ageNote:"Week-long blues camp self-selects deeply committed adult dancers; 26–46 crowd",
    levelNote:"Immersive camp format with no casual drop-ins — one of the highest blues skill concentrations of any event",
    daysOff:5, restDay:false, ptoTotal:5, ptoNote:"~5 weekdays for a full week camp (dates TBD; NC requires flight — ~12 hrs drive, over limit)",
    conflicts:[33,34],
    costs:{
      transport:180, tType:"fly", tNote:"BOS→RDU/CLT RT economy",
      hotelNights:0, hotelRate:0, hotel:0,
      foodPerDay:0, foodDays:0, food:0,
      localXport:0, localNote:"Residential camp — all meals included (details TBD)",
      campIncludes:"Housing + all meals (estimated — details TBD when announced)",
      passMin:350, passMax:500,
      subtotal:180, totalMin:530, totalMax:680,
      eventNote:"Dates TBD; NC flight is cheap. Pass price is the main cost.",
    },
  },

  // ══════════════════════ 2027 (Jan 1 – Mar 29, 2027) ════════════════════════════
  {
    id:101, year:2027, past:false,
    name:"Rock That Swing 2027", dates:"Feb ~11–15", month:2, day:11,
    style:"Multi", region:"Europe", city:"Munich, Germany",
    price:"€200–400 (est.)", travel:"~$970 (fly)", driveable:false,
    ticketStatus:"TBD", ticketNote:"Estimated dates based on annual pattern. Confirm at rockthatswing.com. Typically opens registration ~6 months out.",
    url:"https://rockthatswing.com", type:"Festival",
    description:"Annual return of Europe's largest swing festival. 70+ teachers, 15+ bands, 300+ workshops. Dates estimated — check official site for 2027 schedule.",
    workshop:4, social:4, comp:3, ageMatch:4, levelMatch:4,
    ageNote:"European scene skews 25–45; well-established community crowd",
    levelNote:"Strong Int/Adv presence; some beginners due to festival scale",
    daysOff:3, restDay:false, ptoTotal:3, ptoNote:"~Thu, Fri, Mon (estimated based on 2026 pattern)",
    conflicts:[102,103,104],
    costs:{
      transport:875, tType:"fly", tNote:"BOS→MUC RT economy (est.)",
      hotelNights:4, hotelRate:215, hotel:860,
      foodPerDay:90, foodDays:5, food:450,
      localXport:50, localNote:"S-Bahn/taxi in Munich",
      passMin:220, passMax:450,
      subtotal:2235, totalMin:2455, totalMax:2685,
      eventNote:"Estimated costs based on 2026 actuals + ~3% inflation",
    },
  },
  {
    id:102, year:2027, past:false,
    name:"Flurry Festival 2027", dates:"Feb ~12–14", month:2, day:12,
    style:"Multi", region:"New England", city:"Saratoga Springs, NY",
    price:"$45–220 (est.)", travel:"Driveable (~3.5 hrs)", driveable:true,
    ticketStatus:"TBD", ticketNote:"Annual event — estimated dates. Confirm at flurryfestival.org for 2027.",
    url:"https://www.flurryfestival.org", type:"Festival",
    description:"Annual return of Saratoga's 4,500-person multi-genre dance festival. Swing programming typically includes nationally recognized Lindy instructors.",
    workshop:3, social:3, comp:1, ageMatch:2, levelMatch:2,
    ageNote:"Very broad: families, teens, and seniors all attend; folk/world audience mix",
    levelNote:"Beginner-heavy across many styles; swing floor quality varies",
    daysOff:1, restDay:true, ptoTotal:2, ptoNote:"~Fri + Mon rest day",
    conflicts:[101,103,104],
    costs:{
      transport:60, tType:"drive", tNote:"~3.5 hr drive, gas + tolls RT (est.)",
      hotelNights:2, hotelRate:150, hotel:300,
      foodPerDay:62, foodDays:2, food:124,
      localXport:0, localNote:"Walkable venue",
      passMin:60, passMax:135,
      subtotal:484, totalMin:544, totalMax:619,
      eventNote:"Estimated costs",
    },
  },
  {
    id:103, year:2027, past:false,
    name:"Rose City Blues 2027", dates:"Feb ~19–21", month:2, day:19,
    style:"Blues", region:"West Coast", city:"Portland, OR",
    price:"$100–160 (est.)", travel:"~$770 (fly)", driveable:false,
    ticketStatus:"TBD", ticketNote:"Annual event. Estimated dates — confirm at pdxblues.com for 2027.",
    url:"https://pdxblues.com/rose-city-blues", type:"Weekend Event",
    description:"Annual return of Portland's dedicated blues dance weekend. POC & LGBTQIA+ safer space. Alberta Abbey venue.",
    workshop:3, social:4, comp:0, ageMatch:4, levelMatch:3,
    ageNote:"Pacific NW blues community skews 25–42; activist/queer-centered culture",
    levelNote:"Mixed levels; community-focused rather than all-star heavy",
    daysOff:1, restDay:true, ptoTotal:2, ptoNote:"~Fri 19 + Mon rest day (flight required)",
    conflicts:[101,102,104,105],
    costs:{
      transport:350, tType:"fly", tNote:"BOS→PDX RT economy (est.)",
      hotelNights:2, hotelRate:130, hotel:260,
      foodPerDay:67, foodDays:2, food:134,
      localXport:50, localNote:"Uber PDX→Alberta Abbey",
      passMin:105, passMax:165,
      subtotal:794, totalMin:899, totalMax:959,
      eventNote:"Estimated costs",
    },
  },
  {
    id:104, year:2027, past:false,
    name:"Salt City Stomp 2027", dates:"Feb ~19–21", month:2, day:19,
    style:"Lindy", region:"West", city:"Salt Lake City, UT",
    price:"$120–180 (est.)", travel:"~$740 (fly)", driveable:false,
    ticketStatus:"TBD", ticketNote:"Annual event. Estimated dates — confirm at saltcitystomp.com for 2027.",
    url:"https://www.saltcitystomp.com", type:"Weekend Event",
    description:"Annual return of Salt Lake's Lindy weekend with live jazz. Typically features nationally recognized instructors and a strong competition program.",
    workshop:4, social:3, comp:3, ageMatch:3, levelMatch:3,
    ageNote:"Regional mountain-west crowd; broader age range including younger college dancers",
    levelNote:"Solid Int/Adv but regional footprint limits all-star density on social floor",
    daysOff:1, restDay:true, ptoTotal:2, ptoNote:"~Fri 19 + Mon rest day (flight required)",
    conflicts:[101,102,103,105],
    costs:{
      transport:290, tType:"fly", tNote:"BOS→SLC RT economy (est.)",
      hotelNights:2, hotelRate:160, hotel:320,
      foodPerDay:62, foodDays:2, food:124,
      localXport:40, localNote:"Uber SLC airport",
      passMin:125, passMax:185,
      subtotal:774, totalMin:899, totalMax:959,
      eventNote:"Estimated costs",
    },
  },
  {
    id:105, year:2027, past:false,
    name:"Steel City Blues 2027", dates:"Feb ~26–28", month:2, day:26,
    style:"Blues", region:"Mid-Atlantic", city:"Pittsburgh, PA",
    price:"$200–280 (est.)", travel:"~$610 (fly)", driveable:false,
    ticketStatus:"TBD", ticketNote:"Annual event. Estimated dates — confirm at steelcityblues.com for 2027. Typically sells out within weeks.",
    url:"https://steelcityblues.com", type:"Weekend Event",
    description:"Annual return of Pittsburgh's cornerstone blues weekend, running since 2008. Three workshop tracks, live bands, strong blues culture focus.",
    workshop:4, social:4, comp:2, ageMatch:4, levelMatch:4,
    ageNote:"Core blues community crowd, 26–45; culturally serious, curated vibe filters age extremes",
    levelNote:"Int/Adv dominant; older event with returning community of skilled dancers",
    daysOff:1, restDay:true, ptoTotal:2, ptoNote:"~Fri 26 + Mon rest day (Pittsburgh ~8.5 hrs, over drive limit — fly)",
    conflicts:[103,104,106],
    costs:{
      transport:185, tType:"fly", tNote:"BOS→PIT RT economy (est.)",
      hotelNights:2, hotelRate:200, hotel:400,
      foodPerDay:62, foodDays:2, food:124,
      localXport:40, localNote:"Uber PIT airport",
      passMin:205, passMax:285,
      subtotal:749, totalMin:954, totalMax:1034,
      eventNote:"Estimated costs",
    },
  },
  {
    id:106, year:2027, past:false,
    name:"MADjam 2027", dates:"Mar 4–7", month:3, day:4,
    style:"WCS", region:"Mid-Atlantic", city:"Reston, VA",
    price:"$225 (est.)", travel:"Driveable (~7.5 hrs)", driveable:true,
    ticketStatus:"TBD", ticketNote:"Dates confirmed: Mar 4–7, 2027. Registration opens ~fall 2026. Same format and venue as previous years.",
    url:"https://www.atlanticdancejam.com", type:"Convention",
    description:"2027 edition of the World's Largest WCS Party. Tier 6 WSDC. Mar 4–7, 2027 dates confirmed. Same MADjam format, same Reston venue.",
    workshop:5, social:4, comp:5, ageMatch:4, levelMatch:5,
    ageNote:"WCS competitive community skews 28–52; serious hobbyist demographic",
    levelNote:"Every top All-Star WCS dancer attends; floor packed with champions and rising stars",
    daysOff:2, restDay:true, ptoTotal:3, ptoNote:"Thu 4, Fri 5 + Mon rest day (~7.5 hr drive back from Reston Sunday Mar 7)",
    conflicts:[105,107],
    costs:{
      transport:140, tType:"drive", tNote:"~7.5 hr drive, gas + tolls RT (est.)",
      hotelNights:3, hotelRate:190, hotel:570,
      foodPerDay:72, foodDays:3, food:216,
      localXport:20, localNote:"MADjam hotel block (Hyatt Regency Dulles)",
      passMin:225, passMax:230,
      subtotal:946, totalMin:1171, totalMax:1176,
      eventNote:"Estimated costs based on 2026 + ~3%",
    },
  },
  {
    id:107, year:2027, past:false,
    name:"Great Southwest Lindyfest 2027", dates:"Mar ~11–15", month:3, day:11,
    style:"Lindy", region:"South", city:"Houston, TX",
    price:"$200–300 (est.)", travel:"~$690 (fly)", driveable:false,
    ticketStatus:"TBD", ticketNote:"Annual event — estimated dates. Confirm at Houston Swing Dance Society for 2027.",
    url:"https://www.danceplace.com", type:"Weekend Event",
    description:"Annual return of Texas's largest Lindy event with Lone Star Championships. Leveled workshops with audition. Live music.",
    workshop:4, social:4, comp:4, ageMatch:3, levelMatch:3,
    ageNote:"Broad Texas/regional Lindy community; some college-age dancers mix with 30–50 crowd",
    levelNote:"Auditioned workshops help; floor has good Int/Adv showing during comps, mixed social",
    daysOff:3, restDay:false, ptoTotal:3, ptoNote:"~Thu, Fri, Mon (estimated; ends Monday)",
    conflicts:[106],
    costs:{
      transport:260, tType:"fly", tNote:"BOS→HOU RT economy (est.)",
      hotelNights:4, hotelRate:145, hotel:580,
      foodPerDay:62, foodDays:4, food:248,
      localXport:60, localNote:"Uber from IAH",
      passMin:205, passMax:310,
      subtotal:1148, totalMin:1353, totalMax:1458,
      eventNote:"Estimated costs",
    },
  },
  {
    id:108, year:2027, past:false,
    name:"Boston Tea Party Swings 2027", dates:"Mar ~25–28", month:3, day:25,
    style:"Multi", region:"New England", city:"Newton, MA",
    price:"$205 (est.)", travel:"Driveable (<1 hr)", driveable:true,
    ticketStatus:"TBD", ticketNote:"Annual event — estimated dates for 2027. Confirm at teapartyswings.com.",
    url:"https://teapartyswings.com", type:"Weekend Event",
    description:"Annual return of the only remaining crossover swing event in the US. Separate ballrooms for WCS and Lindy/Bal.",
    workshop:4, social:4, comp:3, ageMatch:3, levelMatch:3,
    ageNote:"Crossover draws wide range; NE regional crowd with some students; decent 28–48 showing",
    levelNote:"Mixed levels by design (crossover); solid Int but beginner tracks dilute floor density",
    daysOff:2, restDay:false, ptoTotal:2, ptoNote:"~Thu, Fri (Newton MA — local, no rest day needed)",
    conflicts:[],
    costs:{
      transport:0, tType:"local", tNote:"Local — drive from Boston area (est.)",
      hotelNights:0, hotelRate:0, hotel:0,
      foodPerDay:72, foodDays:3, food:216,
      localXport:10, localNote:"Gas only",
      passMin:210, passMax:210,
      subtotal:226, totalMin:436, totalMax:436,
      eventNote:"Estimated costs",
    },
  },
];

// Conflicts = events within 7 days of each other (overlap OR recovery window).
// Groups are date clusters — each represents a window where you can realistically only do one thing well.
const CONFLICT_GROUPS = [
  // ── PAST ──────────────────────────────────────────────────────────────────
  { ids:[3,4],        y:2026, past:true,  label:"⚔️ Rose City Blues vs Salt City Stomp (Feb 20–22)" },
  { ids:[8,9,10],     y:2026, past:true,  label:"⚔️ Meet in Middle / River City / Boston Tea Party (Mar 26–29)" },

  // ── MAY ───────────────────────────────────────────────────────────────────
  { ids:[13,14,15],   y:2026, past:false, label:"⚔️ May cluster: Jazz Town / Canadian Swing / Camp Jitterbug (May 14–25) — all within 5 days of each other" },

  // ── LATE JUNE ─────────────────────────────────────────────────────────────
  { ids:[19,17,18],   y:2026, past:false, label:"⚔️ Late June: Oxford LX ends Jun 22 → Liberty Swing / Beantown Camp start Jun 25 (3-day gap)" },

  // ── JULY 4TH WINDOW ───────────────────────────────────────────────────────
  { ids:[17,18,20,21],y:2026, past:false, label:"⚔️ Liberty Swing / Beantown end Jun 28–Jul 2 → Wild Wild Westie / ILHC start Jul 2 (0–4 day gap)" },
  { ids:[20,21,22,23],y:2026, past:false, label:"⚔️ WWW / ILHC end Jul 5 → Herräng starts Jul 4 / Slow Dance Soirée Jul 10 (0–5 day gap)" },

  // ── AUGUST ────────────────────────────────────────────────────────────────
  { ids:[25,26],      y:2026, past:false, label:"⚔️ Swing Fling ends Aug 9 → Express Track Blues starts Aug 15 (6-day gap)" },
  { ids:[26,27],      y:2026, past:false, label:"⚔️ Express Track Blues ends Aug 17 → Summer Hummer starts Aug 20 (3-day gap)" },
  { ids:[27,28,29],   y:2026, past:false, label:"⚔️ Summer Hummer ends Aug 24 → Swing Out NH / Desert City start Aug 26–27 (2–3 day gap)" },
  { ids:[24,28,29,30],y:2026, past:false, label:"⚔️ Late Aug cluster: Uptown / Swing Out NH / Desert City end Aug 30–31 → Camp Hollywood starts Sep 3 (3–4 day gap)" },

  // ── SEPTEMBER ─────────────────────────────────────────────────────────────
  { ids:[31,32,33],   y:2026, past:false, label:"⚔️ Lindy on the Rocks / Rhythm Shuffle end Sep 20 → Dirty Water LX ~Sep 25 (5-day gap)" },

  // ── OCTOBER ───────────────────────────────────────────────────────────────
  { ids:[49,34],      y:2026, past:false, label:"⚔️ Blues Experiment ends ~Oct 7 → Boogie by the Bay starts Oct 8 (1-day gap — back-to-back)" },
  { ids:[34,35,37],   y:2026, past:false, label:"⚔️ Boogie by the Bay ends Oct 12 → Blues Muse / NYLX start Oct 16 (4-day gap)" },
  { ids:[35,37,36],   y:2026, past:false, label:"⚔️ Blues Muse / NYLX end Oct 18 → Flying Home starts Oct 23 (5-day gap)" },
  { ids:[36,38],      y:2026, past:false, label:"⚔️ Flying Home ends Oct 25 → Cat's Corner starts Oct 30 (5-day gap)" },

  // ── NOVEMBER ──────────────────────────────────────────────────────────────
  { ids:[38,39],      y:2026, past:false, label:"⚔️ Cat's Corner ends Nov 1 → Track Town starts Nov 6 (5-day gap)" },
  { ids:[39,40,41,44],y:2026, past:false, label:"⚔️ Track Town ends Nov 8 → NE Swing Classic / Austin LX / PittStop start Nov 12–13 (4–5 day gap)" },
  { ids:[40,41,44,42,48],y:2026,past:false,label:"⚔️ NE Swing Classic / Austin / PittStop end Nov 15 → DCSX / Stompology start Nov 19–20 (4–5 day gap)" },
  { ids:[42,48,43],   y:2026, past:false, label:"⚔️ DCSX / Stompology end Nov 22 → The Open starts Nov 25 (3-day gap)" },

  // ── DECEMBER ──────────────────────────────────────────────────────────────
  { ids:[45,46,47],   y:2026, past:false, label:"⚔️ Dec 26–Jan 3: The Snowball / Lindy Focus / Countdown Swing — overlapping or back-to-back" },

  // ── 2027 ──────────────────────────────────────────────────────────────────
  { ids:[101,102,103,104], y:2027, past:false, label:"⚔️ 2027 Feb: Rock That Swing / Flurry / Rose City Blues / Salt City Stomp — all within one week of each other" },
  { ids:[103,104,105],y:2027, past:false, label:"⚔️ 2027 Feb: Rose City / Salt City end ~Feb 21 → Steel City Blues starts ~Feb 26 (5-day gap)" },
  { ids:[105,106],    y:2027, past:false, label:"⚔️ 2027 Feb–Mar: Steel City Blues ends ~Feb 28 → MADjam 2027 starts Mar 4 (4-day gap)" },
  { ids:[106,107],    y:2027, past:false, label:"⚔️ 2027 Mar: MADjam ends Mar 7 → SW Lindyfest starts ~Mar 11 (4-day gap)" },
];

const SC = {
  Lindy: { bg:"bg-indigo-900/60", border:"border-indigo-500", text:"text-indigo-300", dot:"bg-indigo-500", badge:"bg-indigo-600" },
  Blues: { bg:"bg-amber-950/60",  border:"border-amber-500",  text:"text-amber-300",  dot:"bg-amber-500",  badge:"bg-amber-700"  },
  WCS:   { bg:"bg-purple-950/60", border:"border-purple-500", text:"text-purple-300", dot:"bg-purple-500", badge:"bg-purple-700"  },
  Multi: { bg:"bg-teal-950/60",   border:"border-teal-500",   text:"text-teal-300",   dot:"bg-teal-500",   badge:"bg-teal-700"   },
};
const TS = {
  "Open":     { bg:"bg-green-900/70",  text:"text-green-300",  border:"border-green-600",  icon:"✓" },
  "Sold Out": { bg:"bg-red-900/70",    text:"text-red-300",    border:"border-red-600",    icon:"✗" },
  "TBD":      { bg:"bg-yellow-900/70", text:"text-yellow-300", border:"border-yellow-600", icon:"?" },
};
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const RATINGS_CFG = [
  { key:"social",     icon:"💃", label:"Social",     color:"text-pink-400",   tip:"Floor culture, music quality, community warmth" },
  { key:"ageMatch",   icon:"🎂", label:"Age 25–50",  color:"text-cyan-400",   tip:"How well the crowd skews 25–50" },
  { key:"levelMatch", icon:"⚡", label:"Skill Level", color:"text-lime-400",   tip:"Int/Adv/All-Star density on the social floor" },
  { key:"workshop",   icon:"🎓", label:"Workshop",   color:"text-orange-400", tip:"Instructor caliber, track variety, depth" },
  { key:"comp",       icon:"🏆", label:"Comp",       color:"text-yellow-400", tip:"Competition prestige — 0 = no comp" },
];

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function Stars({ value, color="text-yellow-400", size="sm" }) {
  const sz = size==="xs" ? "text-xs" : "text-sm";
  return (
    <span className="flex gap-0.5">
      {Array.from({length:5}).map((_,i) => (
        <span key={i} className={`${sz} leading-none ${i<value ? color : "text-gray-700"}`}>★</span>
      ))}
    </span>
  );
}

function StyleBadge({style}) {
  const c = SC[style]||SC.Multi;
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.badge} text-white`}>{style}</span>;
}

function TicketBadge({status}) {
  const s = TS[status]||TS.TBD;
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${s.bg} ${s.text} ${s.border}`}>{s.icon} {status}</span>;
}

function PTOBadge({event}) {
  const p = event.ptoTotal;
  const cl = p<=1?"bg-green-900/60 text-green-300 border-green-700":p<=2?"bg-yellow-900/60 text-yellow-300 border-yellow-700":p<=3?"bg-orange-900/60 text-orange-300 border-orange-700":"bg-red-900/60 text-red-300 border-red-700";
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cl}`} title={event.ptoNote}>🗓 {p}d{event.restDay?"*":""}</span>;
}

function AttBadge({status}) {
  if (!status) return null;
  const a = ATT.find(x=>x.v===status);
  if (!a) return null;
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${a.bg} ${a.b} ${a.c}`}>{a.l}</span>;
}

function AttSelect({eventId, value, onChange}) {
  return (
    <select
      value={value||""}
      onChange={e => { onChange(eventId, e.target.value||null); }}
      onClick={e => e.stopPropagation()}
      className="text-xs bg-gray-800 border border-gray-600 text-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
    >
      <option value="">Set status…</option>
      {ATT.map(a => <option key={a.v} value={a.v}>{a.l}</option>)}
    </select>
  );
}

function ConflictBadge({event}) {
  if (!event.conflicts?.length) return null;
  return <span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-red-900/60 text-red-300 border-red-600">⚔️ Conflict</span>;
}

function RatingsGrid({event}) {
  return (
    <div className="grid grid-cols-5 gap-1 mt-3 pt-3 border-t border-white/10">
      {RATINGS_CFG.map(r => (
        <div key={r.key} className="flex flex-col items-center gap-1" title={r.tip}>
          <span className="text-sm">{r.icon}</span>
          <span className="text-center leading-tight text-gray-500" style={{fontSize:"9px"}}>{r.label}</span>
          {event[r.key]>0 ? <Stars value={event[r.key]} color={r.color} size="xs"/> : <span className="text-xs text-gray-700">—</span>}
        </div>
      ))}
    </div>
  );
}

function CostBreakdown({event}) {
  const c = event.costs;
  if (!c) return null;
  const tIcon = c.tType === "local" ? "🏠" : c.tType === "drive" ? "🚗" : "✈️";
  const iscamp = c.hotel === 0 && c.food === 0 && c.campIncludes;
  return (
    <div className="bg-black/30 rounded-xl border border-white/10 overflow-hidden">
      <div className="px-3 py-2 bg-white/5 border-b border-white/10">
        <span className="text-xs font-bold text-gray-200">💰 Full Trip Cost Estimate</span>
        <span className="text-xs text-gray-500 ml-2">excl. drinks & extras</span>
      </div>
      <div className="px-3 py-2 space-y-1.5">
        {/* Transport */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <span className="text-xs text-gray-400">{tIcon} {c.tType === "local" ? "Local" : c.tType === "drive" ? "Drive" : "Flight"}</span>
            <p className="text-xs text-gray-600 truncate">{c.tNote}</p>
          </div>
          <span className="text-xs font-semibold text-gray-200 shrink-0">{c.transport > 0 ? `$${c.transport}` : "Free"}</span>
        </div>
        {/* Hotel */}
        {c.hotel > 0 && (
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <span className="text-xs text-gray-400">🏨 Hotel</span>
              <p className="text-xs text-gray-600">{c.hotelNights} night{c.hotelNights !== 1 ? "s" : ""} × ${c.hotelRate}/night</p>
            </div>
            <span className="text-xs font-semibold text-gray-200">${c.hotel}</span>
          </div>
        )}
        {/* Camp included */}
        {iscamp && (
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <span className="text-xs text-green-400">🏕 Camp all-inclusive</span>
              <p className="text-xs text-gray-600">{c.campIncludes}</p>
            </div>
            <span className="text-xs font-semibold text-green-400">Included</span>
          </div>
        )}
        {/* Food */}
        {c.food > 0 && (
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <span className="text-xs text-gray-400">🍽️ Food</span>
              <p className="text-xs text-gray-600">{c.foodDays} day{c.foodDays !== 1 ? "s" : ""} × ${c.foodPerDay}/day (2 meals + snacks)</p>
            </div>
            <span className="text-xs font-semibold text-gray-200">${c.food}</span>
          </div>
        )}
        {/* Local transport */}
        {c.localXport > 0 && (
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <span className="text-xs text-gray-400">🚕 Local transport</span>
              <p className="text-xs text-gray-600">{c.localNote}</p>
            </div>
            <span className="text-xs font-semibold text-gray-200">${c.localXport}</span>
          </div>
        )}
        {/* Divider + subtotal */}
        <div className="border-t border-white/10 pt-1.5 flex justify-between">
          <span className="text-xs text-gray-500">Trip subtotal</span>
          <span className="text-xs font-semibold text-gray-300">${c.subtotal}</span>
        </div>
        {/* Event pass */}
        <div className="flex justify-between">
          <span className="text-xs text-gray-400">🎟️ Event pass</span>
          <span className="text-xs font-semibold text-gray-200">
            {c.passMin === c.passMax ? `$${c.passMin}` : `$${c.passMin}–$${c.passMax}`}
          </span>
        </div>
        {/* Total */}
        <div className="border-t border-white/10 pt-1.5 flex justify-between">
          <span className="text-xs font-bold text-white">Total</span>
          <span className="text-sm font-black text-yellow-400">
            {c.totalMin === c.totalMax ? `$${c.totalMin}` : `$${c.totalMin}–$${c.totalMax}`}
          </span>
        </div>
        {/* Tip */}
        {c.eventNote && <p className="text-xs text-gray-500 italic pt-0.5">💡 {c.eventNote}</p>}
      </div>
    </div>
  );
}

function RatingsExpanded({event}) {
  return (
    <div className="space-y-2">
      {RATINGS_CFG.map(r => (
        <div key={r.key} className="flex items-start gap-2">
          <span className="text-sm w-5 shrink-0 mt-0.5">{r.icon}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400 w-20 shrink-0">{r.label}</span>
              {event[r.key]>0 ? <Stars value={event[r.key]} color={r.color} size="xs"/> : <span className="text-xs text-gray-600">— no comp</span>}
            </div>
            {r.key==="ageMatch" && event.ageNote && <p className="text-xs text-cyan-400/70 mt-0.5">{event.ageNote}</p>}
            {r.key==="levelMatch" && event.levelNote && <p className="text-xs text-lime-400/70 mt-0.5">{event.levelNote}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function EventCard({event, expanded, onToggle, attendance, onAttendance}) {
  const c = SC[event.style]||SC.Multi;
  const hasConflict = event.conflicts?.length>0;
  return (
    <div className={`rounded-xl border ${hasConflict?"border-red-500/50":c.border} ${c.bg} overflow-hidden cursor-pointer hover:brightness-110 transition-all`} onClick={onToggle}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <StyleBadge style={event.style}/>
              <span className="text-xs text-gray-400 font-mono">{event.dates}{event.year===2027?" (est.)":""}</span>
              {event.driveable && <span className="text-xs text-green-400 font-semibold">🚗</span>}
              {hasConflict && <ConflictBadge event={event}/>}
            </div>
            <div className="font-bold text-white text-base leading-tight">{event.name}</div>
            <div className="text-xs text-gray-400 mt-0.5">📍 {event.city}</div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <TicketBadge status={event.ticketStatus}/>
            <PTOBadge event={event}/>
            {event.costs && (
              <span className="text-xs font-bold text-yellow-400 bg-yellow-950/50 border border-yellow-800/60 px-2 py-0.5 rounded-full">
                💰 {event.costs.totalMin === event.costs.totalMax ? `$${event.costs.totalMin}` : `$${event.costs.totalMin}–$${event.costs.totalMax}`}
              </span>
            )}
            <AttBadge status={attendance}/>
          </div>
        </div>
        <RatingsGrid event={event}/>
      </div>
      {expanded && (
        <div className={`border-t ${c.border} px-4 py-3 bg-black/30 space-y-3`}>
          {hasConflict && (
            <div className="bg-red-900/40 border border-red-700/60 rounded-lg px-3 py-2 text-xs text-red-300">
              ⚔️ <strong>Schedule conflict</strong> with event(s) #{event.conflicts.join(", ")} — cannot attend both.
            </div>
          )}
          <p className="text-xs text-gray-400 leading-relaxed">{event.description}</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-800/60 rounded-lg px-3 py-2">
              <p className="text-xs font-semibold text-gray-400 mb-0.5">🗓 PTO Required</p>
              <p className="text-white font-bold">{event.ptoTotal} day{event.ptoTotal!==1?"s":""}{event.restDay?" *":""}</p>
              <p className="text-xs text-gray-500">{event.ptoNote}</p>
            </div>
            {event.costs && (
              <div className="bg-gray-800/60 rounded-lg px-3 py-2">
                <p className="text-xs font-semibold text-gray-400 mb-0.5">💰 Total Cost</p>
                <p className="text-yellow-400 font-black text-lg leading-tight">
                  {event.costs.totalMin === event.costs.totalMax ? `$${event.costs.totalMin}` : `$${event.costs.totalMin}–$${event.costs.totalMax}`}
                </p>
                <p className="text-xs text-gray-500">pass + all expenses</p>
              </div>
            )}
          </div>
          <CostBreakdown event={event}/>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Your status:</span>
            <AttSelect eventId={event.id} value={attendance} onChange={onAttendance}/>
          </div>
          <RatingsExpanded event={event}/>
          <div className={`text-xs p-2 rounded border ${TS[event.ticketStatus]?.bg} ${TS[event.ticketStatus]?.text} ${TS[event.ticketStatus]?.border}`}>
            🎟 {event.ticketNote}
          </div>
          <a href={safeUrl(event.url)} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className={`text-xs underline ${c.text}`}>🔗 Official Website →</a>
        </div>
      )}
    </div>
  );
}

function MiniRow({event, attendance, onAttendance}) {
  const c = SC[event.style]||SC.Multi;
  const [open, setOpen] = useState(false);
  const hasConflict = event.conflicts?.length>0;
  return (
    <div className={`rounded-lg border-l-4 ${hasConflict?"border-l-red-500":c.border} bg-gray-900/60 px-3 py-2.5 cursor-pointer hover:bg-gray-800/60 transition-colors`} onClick={()=>setOpen(o=>!o)}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${hasConflict?"bg-red-500":c.dot}`}/>
          <span className="text-sm font-semibold text-white truncate">{event.name}{event.year===2027?" '27":""}</span>
          {hasConflict && <span className="text-xs text-red-400">⚔️</span>}
          {attendance && <AttBadge status={attendance}/>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <PTOBadge event={event}/>
          <TicketBadge status={event.ticketStatus}/>
          {event.driveable && <span className="text-xs text-green-400">🚗</span>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-1 ml-4">
        <span className="text-xs text-gray-400">📍 {event.city}</span>
        <span className="text-gray-700 text-xs">·</span>
        <span className="text-xs text-gray-500">{event.dates}</span>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 ml-4">
        {RATINGS_CFG.map(r => (
          <span key={r.key} className={`flex items-center gap-0.5 text-xs ${r.color}`} title={r.tip}>
            {r.icon}<span className="font-bold">{event[r.key]>0?event[r.key]:"—"}</span>
          </span>
        ))}
      </div>
      {open && (
        <div className="mt-3 pl-4 border-l border-gray-700 space-y-1.5">
          {hasConflict && <p className="text-xs text-red-400">⚔️ Conflicts with #{event.conflicts.join(", ")}</p>}
          <p className="text-xs text-gray-400">{event.description}</p>
          <p className="text-xs"><span className="text-gray-500">🗓 PTO:</span> <span className="text-white font-semibold">{event.ptoTotal} days</span> <span className="text-gray-500 italic">— {event.ptoNote}</span></p>
          {event.ageNote && <p className="text-xs text-cyan-400/80">🎂 {event.ageNote}</p>}
          {event.levelNote && <p className="text-xs text-lime-400/80">⚡ {event.levelNote}</p>}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Status:</span>
            <AttSelect eventId={event.id} value={attendance} onChange={onAttendance}/>
          </div>
          <p className="text-xs text-gray-500">🎟 {event.ticketNote}</p>
          <p className="text-xs text-gray-400">
            🚗/✈️ <span className="text-white">{tripDisplay(event)}</span>
            {" · "}
            <span className="text-gray-500">Pass:</span> <span className="text-gray-300">{event.price}</span>
            {event.costs && <span className="text-yellow-400 font-bold"> · Total: {event.costs.totalMin===event.costs.totalMax?`$${event.costs.totalMin}`:`$${event.costs.totalMin}–$${event.costs.totalMax}`}</span>}
          </p>
          <a href={safeUrl(event.url)} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className={`text-xs ${c.text} underline`}>Website →</a>
        </div>
      )}
    </div>
  );
}

function CalendarView({events, attendance, onAttendance}) {
  // Group by year+month
  const groups = useMemo(() => {
    const map = {};
    events.forEach(e => {
      const key = `${e.year}-${e.month}`;
      if (!map[key]) map[key] = {year:e.year, month:e.month, evts:[]};
      map[key].evts.push(e);
    });
    return Object.values(map).sort((a,b)=>(a.year*100+a.month)-(b.year*100+b.month));
  }, [events]);
  const qBorder = [null,"border-blue-700","border-blue-700","border-blue-700","border-green-700","border-green-700","border-green-700","border-orange-700","border-orange-700","border-orange-700","border-red-800","border-red-800","border-red-800"];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 text-xs bg-gray-900/60 rounded-lg p-3 border border-gray-800">
        <span className="text-gray-500 font-semibold">Ratings:</span>
        {RATINGS_CFG.map(r=><span key={r.key} className={`flex items-center gap-1 ${r.color}`}>{r.icon}{r.label}</span>)}
        <span className="text-gray-600">·</span>
        <span className="text-green-300">🗓 PTO</span>
        <span className="text-red-400">⚔️ conflict</span>
        <span className="text-gray-600">· Click to expand + set status</span>
      </div>
      {groups.map(({year,month,evts})=>{
        const hasConflicts = evts.some(e=>e.conflicts?.length>0);
        const label = `${MONTHS[month-1]} ${year}`;
        return (
          <div key={`${year}-${month}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`text-base font-bold text-white px-4 py-1 rounded-full bg-gray-800 border ${qBorder[month]}`}>{label}</div>
              {hasConflicts && <span className="text-xs text-red-400 font-semibold">⚔️ conflicts</span>}
              {year===2027 && <span className="text-xs text-yellow-600 font-semibold">📌 estimated dates</span>}
              <div className="flex-1 h-px bg-gray-700"/>
              <span className="text-xs text-gray-500">{evts.length} event{evts.length>1?"s":""}</span>
            </div>
            <div className="space-y-2">
              {[...evts].sort((a,b)=>a.day-b.day).map(e=><MiniRow key={e.id} event={e} attendance={attendance[e.id]} onAttendance={onAttendance}/>)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TopPicksView({events, attendance, onAttendance}) {
  const [filter, setFilter] = useState("All");
  const filtered = filter==="All" ? events : events.filter(e=>e.style===filter);
  const sorted = [...filtered].sort((a,b)=>(b.social+b.ageMatch+b.levelMatch)-(a.social+a.ageMatch+a.levelMatch)).slice(0,15);
  return (
    <div className="space-y-4">
      <div className="bg-gray-900/60 rounded-xl border border-gray-700 p-4">
        <p className="font-semibold text-white mb-1">🎯 Vibe Score = 💃 Social + 🎂 Age 25–50 + ⚡ Skill Level (max 15)</p>
        <p className="text-xs text-gray-500 mb-3">Top 15 upcoming events ranked by your priorities.</p>
        <div className="flex flex-wrap gap-1">
          {["All","Lindy","Blues","WCS","Multi"].map(s=>{
            const c = s==="All"?null:SC[s];
            return <button key={s} onClick={()=>setFilter(s)} className={`text-xs px-3 py-1 rounded-full font-semibold border transition-colors ${filter===s?(c?`${c.badge} border-transparent text-white`:"bg-indigo-700 border-indigo-500 text-white"):"bg-gray-800 border-gray-700 text-gray-400"}`}>{s}</button>;
          })}
        </div>
      </div>
      <div className="space-y-3">
        {sorted.map((event,i)=>{
          const c = SC[event.style]||SC.Multi;
          const score = event.social+event.ageMatch+event.levelMatch;
          const medal = i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`;
          const pct = Math.round((score/15)*100);
          return (
            <div key={event.id} className={`rounded-xl border ${event.conflicts?.length?"border-red-500/40":c.border} ${c.bg} p-4`}>
              <div className="flex items-start gap-3">
                <span className="text-xl shrink-0 mt-1">{medal}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <StyleBadge style={event.style}/>
                    <span className="text-xs text-gray-400 font-mono">{event.dates}{event.year===2027?" (est.)":""}</span>
                    {event.driveable && <span className="text-xs text-green-400">🚗</span>}
                    <TicketBadge status={event.ticketStatus}/>
                    <PTOBadge event={event}/>
                    {event.conflicts?.length>0 && <ConflictBadge event={event}/>}
                    <AttBadge status={attendance[event.id]}/>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-white text-base">{event.name}</div>
                      <div className="text-xs text-gray-400">📍 {event.city}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-2xl font-black ${c.text}`}>{score}<span className="text-sm text-gray-500">/15</span></div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-1.5 mt-2 mb-3">
                    <div className={`h-1.5 rounded-full ${score>=13?"bg-lime-500":score>=10?"bg-yellow-500":"bg-sky-500"}`} style={{width:`${pct}%`}}/>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[{key:"social",icon:"💃",label:"Social",color:"text-pink-400"},{key:"ageMatch",icon:"🎂",label:"Age 25–50",color:"text-cyan-400"},{key:"levelMatch",icon:"⚡",label:"Skill Level",color:"text-lime-400"}].map(r=>(
                      <div key={r.key} className="bg-black/20 rounded-lg p-2">
                        <div className="text-xs text-gray-500 mb-1">{r.icon} {r.label}</div>
                        <Stars value={event[r.key]} color={r.color} size="sm"/>
                      </div>
                    ))}
                  </div>
                  {event.ageNote && <p className="text-xs text-cyan-400/80 mb-1">🎂 {event.ageNote}</p>}
                  {event.levelNote && <p className="text-xs text-lime-400/80 mb-2">⚡ {event.levelNote}</p>}
                  <p className="text-xs text-gray-500 italic mb-2">🗓 {event.ptoNote}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-400">
                      <span className="text-gray-500">Pass:</span> {event.price} · {tripDisplay(event)}
                      {event.costs && <span className="text-yellow-400 font-bold"> · Total: {event.costs.totalMin===event.costs.totalMax?`$${event.costs.totalMin}`:`$${event.costs.totalMin}–$${event.costs.totalMax}`}</span>}
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                      <AttSelect eventId={event.id} value={attendance[event.id]} onChange={onAttendance}/>
                      <a href={safeUrl(event.url)} target="_blank" rel="noopener noreferrer" className={`text-xs ${c.text} underline`}>Site →</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConflictsView({allEvents, attendance, onAttendance}) {
  const eventMap = Object.fromEntries(allEvents.map(e=>[e.id,e]));
  const futureGroups = CONFLICT_GROUPS.filter(g=>!g.past && g.ids.some(id=>!eventMap[id]?.past));
  return (
    <div className="space-y-4">
      <div className="bg-gray-900/60 rounded-xl border border-gray-700 p-4 text-sm">
        <p className="font-semibold text-white mb-1">⚔️ Schedule Conflicts — Upcoming Events</p>
        <p className="text-xs text-gray-500">Each group requires a choice. Vibe scores shown to help you decide.</p>
      </div>
      {futureGroups.map((group)=>{
        const evts = group.ids.map(id=>eventMap[id]).filter(e=>e&&!e.past);
        if (evts.length<2) return null;
        return (
          <div key={group.label} className="rounded-xl border border-red-800/60 bg-red-950/30 p-4">
            <h3 className="text-sm font-bold text-red-300 mb-3">{group.label}</h3>
            <div className="space-y-2">
              {evts.map(event=>{
                const c = SC[event.style]||SC.Multi;
                const score = event.social+event.ageMatch+event.levelMatch;
                const att = attendance[event.id];
                return (
                  <div key={event.id} className={`flex items-center gap-3 rounded-lg border ${c.border} ${c.bg} px-3 py-2`}>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`}/>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StyleBadge style={event.style}/>
                        <span className="text-sm font-semibold text-white">{event.name}</span>
                        <TicketBadge status={event.ticketStatus}/>
                        <PTOBadge event={event}/>
                        {att && <AttBadge status={att}/>}
                      </div>
                      <div className="flex flex-wrap gap-x-3 mt-1">
                        <span className="text-xs text-pink-400">💃{event.social}★</span>
                        <span className="text-xs text-cyan-400">🎂{event.ageMatch}★</span>
                        <span className="text-xs text-lime-400">⚡{event.levelMatch}★</span>
                        <span className={`text-xs font-bold ${c.text}`}>Vibe {score}/15</span>
                        <span className="text-xs text-green-400">{event.driveable?"🚗 Drive":"✈️ Fly"}</span>
                      </div>
                    </div>
                    <AttSelect eventId={event.id} value={att} onChange={onAttendance}/>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TicketTracker({events, attendance}) {
  const groups = [
    {label:"✓ Open Now", filter:"Open", cls:"border-green-600 bg-green-900/20 text-green-400"},
    {label:"✗ Sold Out", filter:"Sold Out", cls:"border-red-700 bg-red-900/20 text-red-400"},
    {label:"? Watch List (TBD)", filter:"TBD", cls:"border-yellow-700 bg-yellow-900/20 text-yellow-400"},
  ];
  return (
    <div className="space-y-6">
      {groups.map(({label,filter,cls})=>{
        const [bc,bgc,tc] = cls.split(" ");
        const evts = events.filter(e=>e.ticketStatus===filter);
        return (
          <div key={label} className={`rounded-xl border p-4 ${bc} ${bgc}`}>
            <h3 className={`font-bold text-lg mb-3 ${tc}`}>{label} ({evts.length})</h3>
            <div className="space-y-2">
              {evts.map(e=>{
                const c = SC[e.style]||SC.Multi;
                const att = attendance[e.id];
                return (
                  <div key={e.id} className="flex items-start gap-3 bg-black/30 rounded-lg px-3 py-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 mt-2 ${c.dot}`}/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">{e.name}</span>
                        {e.conflicts?.length>0 && <span className="text-xs text-red-400">⚔️</span>}
                        {att && <AttBadge status={att}/>}
                      </div>
                      <div className="text-xs text-gray-400">{e.dates} · {e.city}</div>
                      <div className="flex flex-wrap gap-x-3 mt-1">
                        <span className="text-xs text-pink-400">💃{e.social}★</span>
                        <span className="text-xs text-cyan-400">🎂{e.ageMatch}★</span>
                        <span className="text-xs text-lime-400">⚡{e.levelMatch}★</span>
                        <PTOBadge event={e}/>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{e.ticketNote}</div>
                    </div>
                    <a href={safeUrl(e.url)} target="_blank" rel="noopener noreferrer" className={`text-xs ${c.text} underline shrink-0`}>→</a>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PastView({events, attendance, onAttendance}) {
  const sorted = [...events].sort((a,b)=>(b.year*100+b.month)-(a.year*100+a.month)||(b.day-a.day));
  const wentCount = sorted.filter(e=>attendance[e.id]==="went").length;
  return (
    <div className="space-y-4">
      <div className="bg-gray-900/60 rounded-xl border border-gray-700 p-4">
        <p className="font-semibold text-white mb-1">🕰 Past Events — Your Dance Record</p>
        <p className="text-xs text-gray-500">Events that ended before April 4, 2026. Mark what you attended to build your history.</p>
        {wentCount>0 && <p className="text-xs text-yellow-400 mt-1 font-semibold">🎉 You went to {wentCount} event{wentCount!==1?"s":""} — nice!</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sorted.map(event=>{
          const c = SC[event.style]||SC.Multi;
          const att = attendance[event.id];
          return (
            <div key={event.id} className={`rounded-xl border ${c.border} ${c.bg} p-4 relative`}>
              {att==="went" && <div className="absolute top-2 right-2 text-lg">🎉</div>}
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <StyleBadge style={event.style}/>
                <span className="text-xs text-gray-400 font-mono">{event.dates}</span>
                {event.driveable && <span className="text-xs text-green-400">🚗</span>}
              </div>
              <div className="font-bold text-white">{event.name}</div>
              <div className="text-xs text-gray-400">📍 {event.city}</div>
              <div className="flex flex-wrap gap-x-3 mt-2">
                <span className="text-xs text-pink-400">💃{event.social}★</span>
                <span className="text-xs text-cyan-400">🎂{event.ageMatch}★</span>
                <span className="text-xs text-lime-400">⚡{event.levelMatch}★</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <AttSelect eventId={event.id} value={att} onChange={onAttendance}/>
                {att && <AttBadge status={att}/>}
              </div>
              {event.conflicts?.length>0 && <p className="text-xs text-red-400/60 mt-1">⚔️ Conflicted with #{event.conflicts.join(", ")}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BudgetView({events, attendance}) {
  const [sortBy, setSortBy] = useState("total");
  const upcoming = events.filter(e=>!e.past && e.costs);

  const sorted = [...upcoming].sort((a,b) => {
    if (sortBy === "total")  return a.costs.totalMin - b.costs.totalMin;
    if (sortBy === "totalD") return b.costs.totalMin - a.costs.totalMin;
    if (sortBy === "vibe")   return (b.social+b.ageMatch+b.levelMatch)-(a.social+a.ageMatch+a.levelMatch);
    if (sortBy === "pto")    return a.ptoTotal - b.ptoTotal;
    if (sortBy === "date")   return (a.year*10000+a.month*100+a.day)-(b.year*10000+b.month*100+b.day);
    return 0;
  });

  const totalPaid = upcoming.filter(e=>["paid","went"].includes(attendance[e.id]));
  const committedMin = totalPaid.reduce((s,e)=>s+e.costs.totalMin, 0);
  const committedMax = totalPaid.reduce((s,e)=>s+e.costs.totalMax, 0);

  const allTotalMin = upcoming.reduce((s,e)=>s+e.costs.totalMin, 0);

  // summary stats
  const avgTotal = Math.round(allTotalMin / upcoming.length);
  const cheapest = [...upcoming].sort((a,b)=>a.costs.totalMin-b.costs.totalMin)[0];
  const priciest = [...upcoming].sort((a,b)=>b.costs.totalMin-a.costs.totalMin)[0];

  return (
    <div className="space-y-5">
      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {label:"Avg Trip Cost", val:`$${avgTotal}`, sub:"per event incl. pass", cls:"border-gray-600"},
          {label:"Cheapest Event", val:cheapest?`$${cheapest.costs.totalMin}`:"—", sub:cheapest?.name, cls:"border-green-700"},
          {label:"Priciest Event", val:priciest?`$${priciest.costs.totalMin}`:"—", sub:priciest?.name, cls:"border-red-700"},
          {label:"Paid/Went Committed", val:committedMin===committedMax?`$${committedMin}`:`$${committedMin}–$${committedMax}`, sub:`${totalPaid.length} event${totalPaid.length!==1?"s":""}`, cls:"border-yellow-700"},
        ].map(g=>(
          <div key={g.label} className={`rounded-xl border bg-gray-900/60 p-3 ${g.cls}`}>
            <p className="text-xs text-gray-500 mb-1">{g.label}</p>
            <p className="text-lg font-black text-white leading-tight">{g.val}</p>
            <p className="text-xs text-gray-500 truncate">{g.sub}</p>
          </div>
        ))}
      </div>

      {/* Cost category boxes */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {icon:"🏠",label:"Local / Drive",evts:upcoming.filter(e=>e.driveable),cls:"border-green-700 bg-green-900/20 text-green-400"},
          {icon:"✈️",label:"US Flights",evts:upcoming.filter(e=>!e.driveable&&!["Europe","Canada"].includes(e.region)),cls:"border-sky-700 bg-sky-900/20 text-sky-400"},
          {icon:"🌍",label:"Intl / Canada",evts:upcoming.filter(e=>["Europe","Canada"].includes(e.region)),cls:"border-purple-700 bg-purple-900/20 text-purple-400"},
        ].map(g=>{
          const [bc,bgc,tc]=g.cls.split(" ");
          const avg = g.evts.length ? Math.round(g.evts.reduce((s,e)=>s+e.costs.totalMin,0)/g.evts.length) : 0;
          return (
            <div key={g.label} className={`rounded-xl border p-3 ${bc} ${bgc}`}>
              <div className="text-xl mb-1">{g.icon}</div>
              <div className={`text-base font-bold ${tc}`}>{g.evts.length} events</div>
              <div className="text-xs text-gray-300">{g.label}</div>
              {avg > 0 && <div className="text-xs text-gray-500 mt-0.5">Avg ~${avg}</div>}
            </div>
          );
        })}
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500 font-semibold">Sort:</span>
        {[
          {v:"total",l:"💰 Cost ↑"},
          {v:"totalD",l:"💰 Cost ↓"},
          {v:"vibe",l:"🎯 Vibe Score"},
          {v:"pto",l:"🗓 Fewest PTO"},
          {v:"date",l:"📅 Date"},
        ].map(s=>(
          <button key={s.v} onClick={()=>setSortBy(s.v)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${sortBy===s.v?"bg-indigo-700 border-indigo-500 text-white":"bg-gray-800 border-gray-700 text-gray-400"}`}>
            {s.l}
          </button>
        ))}
      </div>

      {/* Per-event cost table */}
      <div className="space-y-2">
        {sorted.map((event) => {
          const c = SC[event.style]||SC.Multi;
          const co = event.costs;
          const att = attendance[event.id];
          const tIcon = co.tType==="local"?"🏠":co.tType==="drive"?"🚗":"✈️";
          const iscamp = co.hotel===0 && co.food===0 && co.campIncludes;
          return (
            <div key={event.id} className={`rounded-xl border ${c.border} ${c.bg}`}>
              {/* Header row */}
              <div className="flex items-center gap-2 px-3 py-2.5 flex-wrap">
                <span className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`}/>
                <span className="text-sm font-bold text-white flex-1 min-w-0 truncate">{event.name}{event.year===2027?" '27":""}</span>
                <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                  <span className="text-xs text-gray-400">{event.dates}</span>
                  <PTOBadge event={event}/>
                  {att && <AttBadge status={att}/>}
                  <span className="text-xs font-black text-yellow-400 bg-yellow-950/50 border border-yellow-800/60 px-2 py-0.5 rounded-full">
                    {co.totalMin===co.totalMax?`$${co.totalMin}`:`$${co.totalMin}–$${co.totalMax}`}
                  </span>
                </div>
              </div>
              {/* Cost bar breakdown */}
              <div className="px-3 pb-2.5 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs">
                <div>
                  <span className="text-gray-500">{tIcon} Transport</span>
                  <p className="text-gray-200 font-semibold">${co.transport} <span className="text-gray-600 font-normal truncate">{co.tNote.split(',')[0]}</span></p>
                </div>
                <div>
                  <span className="text-gray-500">🏨 Hotel</span>
                  <p className="text-gray-200 font-semibold">
                    {iscamp ? <span className="text-green-400">Included</span> : co.hotel>0 ? `$${co.hotel}` : <span className="text-green-400">$0 (local/camp)</span>}
                    {co.hotel>0 && <span className="text-gray-600 font-normal"> ({co.hotelNights}× ${co.hotelRate})</span>}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">🍽️ Food</span>
                  <p className="text-gray-200 font-semibold">
                    {iscamp ? <span className="text-green-400">Included</span> : co.food>0 ? `$${co.food}` : <span className="text-green-400">$0 (camp)</span>}
                    {co.food>0 && <span className="text-gray-600 font-normal"> ({co.foodDays}× ${co.foodPerDay})</span>}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">🎟️ Pass</span>
                  <p className="text-gray-200 font-semibold">{co.passMin===co.passMax?`$${co.passMin}`:`$${co.passMin}–$${co.passMax}`}</p>
                </div>
                {co.eventNote && (
                  <p className="col-span-2 sm:col-span-4 text-gray-500 italic mt-0.5">💡 {co.eventNote}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Multi-event hubs */}
      <div className="rounded-xl border border-gray-700 bg-gray-900/40 p-4">
        <h3 className="font-bold text-white mb-3">🏆 Multi-event trip hubs — maximize trips from Boston</h3>
        {[
          {hub:"DC / Virginia (Reston, Dulles, Glen Echo)", evts:["MADjam","DCLX","Swing Fling","DCSX"], travel:"🚗 ~7.5 hrs", note:"4 events, same drive + hotel block"},
          {hub:"Montréal, QC", evts:["ILHC","Canadian Swing Champs","Cat's Corner"], travel:"🚗 ~5 hrs", note:"3 events; Montréal hotel rates ~20% cheaper than US"},
          {hub:"Philadelphia area", evts:["Jazz Town","Blues Muse","Liberty Swing (NJ)"], travel:"🚗 ~5.5 hrs", note:"3 events; Amtrak from South Station also viable"},
          {hub:"New York City", evts:["Express Track Blues","New York Lindy Exchange"], travel:"🚗 ~4 hrs", note:"2 events; outer Brooklyn parking saves $50+/night vs Manhattan"},
          {hub:"Rochester, NY", evts:["Slow Dance Soirée","Stompology"], travel:"🚗 ~5.5 hrs", note:"2 events at same venue area; cheapest multi-event drive"},
        ].map(h=>(
          <div key={h.hub} className="mb-3 p-3 bg-gray-800/60 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-white text-sm">{h.hub}</span>
              <span className="text-xs text-green-400">{h.travel}</span>
            </div>
            <div className="flex flex-wrap gap-1 mb-1">
              {h.evts.map(ev=><span key={ev} className="text-xs bg-gray-700 text-gray-300 rounded px-2 py-0.5">{ev}</span>)}
            </div>
            <p className="text-xs text-gray-500">{h.note}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-600 text-center">All costs estimated from 2025–2026 market data. Hotel rates = budget 3-star minimum. Food = 2 meals + snacks/day, no alcohol. Flights = economy RT from BOS. Actual prices vary.</p>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function DanceCalendar() {
  const [tab, setTab] = useState("toppicks");
  const [attendance, setAttendance] = useState({});
  const [attFilter, setAttFilter] = useState([]); // multi-select: values from ATT + "unset"
  const [styleFilter, setStyleFilter] = useState("All");
  const [regionFilter, setRegionFilter] = useState("All");
  const [sortBy, setSortBy] = useState("vibe");
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState("");
  const [saveStatus, setSaveStatus] = useState(null); // "saved" | "imported" | "error"

  // ── Persistence: localStorage as working state, JSON file as source of truth ──

  // On mount: load from localStorage (fast), which was last populated by an import
  useEffect(()=>{
    try {
      const stored = localStorage.getItem("dance-att-v2");
      if (stored) setAttendance(JSON.parse(stored));
    } catch(_) {}
  },[]);

  // Write-through to localStorage on every change
  const handleAttendance = useCallback((id, val) => {
    setAttendance(prev => {
      const next = {...prev};
      if (val) next[id] = val; else delete next[id];
      try { localStorage.setItem("dance-att-v2", JSON.stringify(next)); } catch(_) {}
      return next;
    });
  }, []);

  // ── Export: download attendance.json for committing to git ──
  const handleExport = () => {
    const eventMeta = {};
    EVENTS.forEach(e => {
      if (attendance[e.id]) {
        eventMeta[e.id] = {
          status: attendance[e.id],
          name: e.name,
          dates: e.dates,
          year: e.year,
        };
      }
    });
    const payload = {
      exportedAt: new Date().toISOString(),
      version: 2,
      attendance: eventMeta,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus(null), 3000);
  };

  // ── Import: load attendance.json from disk (e.g. after git pull) ──
  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const VALID = new Set(ATT.map(a => a.v));
        // Support both v2 format (with metadata) and raw {id: status} format.
        // parseInt keys: JSON keys are always strings; app uses numeric event ids.
        // Filter invalid entries rather than rejecting the whole file.
        let att;
        if (parsed.version === 2) {
          att = Object.fromEntries(
            Object.entries(parsed.attendance)
              .filter(([, v]) => VALID.has(v?.status))
              .map(([k, v]) => [parseInt(k, 10), v.status])
          );
        } else {
          att = Object.fromEntries(
            Object.entries(parsed)
              .filter(([, v]) => VALID.has(v))
              .map(([k, v]) => [parseInt(k, 10), v])
          );
        }
        setAttendance(att);
        localStorage.setItem("dance-att-v2", JSON.stringify(att));
        setSaveStatus("imported");
        setTimeout(() => setSaveStatus(null), 3000);
      } catch(_) {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus(null), 3000);
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-imported
    e.target.value = "";
  };

  const toggleAttFilter = v => setAttFilter(prev => prev.includes(v) ? prev.filter(x=>x!==v) : [...prev,v]);

  const pastEvents   = useMemo(()=>EVENTS.filter(e=>e.past), []);
  const futureEvents = useMemo(()=>EVENTS.filter(e=>!e.past), []);

  const regions = ["All","New England","Northeast","Mid-Atlantic","South","Midwest","West","West Coast","Europe","Canada"];

  const filteredEvents = useMemo(()=>{
    let evts = futureEvents;
    if (styleFilter!=="All") evts = evts.filter(e=>e.style===styleFilter);
    if (regionFilter!=="All") evts = evts.filter(e=>e.region===regionFilter);
    if (search.trim()) evts = evts.filter(e=>e.name.toLowerCase().includes(search.toLowerCase())||e.city.toLowerCase().includes(search.toLowerCase()));
    if (attFilter.length>0) {
      evts = evts.filter(e=>{
        const s = attendance[e.id]||null;
        return attFilter.some(f=>f==="unset"?!s:s===f);
      });
    }
    const sorts = {
      vibe:(a,b)=>(b.social+b.ageMatch+b.levelMatch)-(a.social+a.ageMatch+a.levelMatch),
      date:(a,b)=>(a.year*10000+a.month*100+a.day)-(b.year*10000+b.month*100+b.day),
      pto:(a,b)=>a.ptoTotal-b.ptoTotal,
      social:(a,b)=>b.social-a.social,
      age:(a,b)=>b.ageMatch-a.ageMatch,
      level:(a,b)=>b.levelMatch-a.levelMatch,
      workshop:(a,b)=>b.workshop-a.workshop,
      local:(a,b)=>(a.driveable?-1:1)-(b.driveable?-1:1),
    };
    return [...evts].sort(sorts[sortBy]||sorts.date);
  },[futureEvents,styleFilter,regionFilter,search,attFilter,attendance,sortBy]);

  const tabs = [
    {id:"toppicks",  label:"🎯 Top Picks"},
    {id:"calendar",  label:"📅 Calendar"},
    {id:"cards",     label:"🗂 All Events"},
    {id:"conflicts", label:"⚔️ Conflicts"},
    {id:"past",      label:"🕰 Past"},
    {id:"tickets",   label:"🎟 Tickets"},
    {id:"budget",    label:"💰 Budget"},
  ];

  const showFilters = ["toppicks","calendar","cards"].includes(tab);
  const conflictCount = futureEvents.filter(e=>e.conflicts?.length>0).length;
  const wentCount = pastEvents.filter(e=>attendance[e.id]==="went").length;

  return (
    <div className="bg-gray-950 min-h-screen text-gray-100" style={{fontFamily:"Inter,sans-serif"}}>
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-purple-950 border-b border-gray-800 px-4 py-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">🕺 Dance Calendar — Apr 2026 → Mar 2027</h1>
          <p className="text-gray-400 mt-1 text-sm">{EVENTS.length} events · Lindy · Blues · WCS · US & Europe · From Boston (drive up to DC / Montréal)</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {["Lindy","Blues","WCS","Multi"].map(s=><span key={s} className={`text-xs px-2 py-0.5 rounded-full font-bold ${SC[s].badge} text-white`}>{s}: {EVENTS.filter(e=>e.style===s&&!e.past).length} upcoming</span>)}
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-green-700 text-white">🚗 Driveable: {futureEvents.filter(e=>e.driveable).length}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-red-800 text-white">⚔️ Conflicts: {conflictCount}</span>
            {wentCount>0 && <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-yellow-700 text-white">🎉 Went: {wentCount}</span>}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {RATINGS_CFG.map(r=><span key={r.key} className={`text-xs flex items-center gap-1 ${r.color} bg-black/30 px-2 py-0.5 rounded-full`}>{r.icon} {r.label}</span>)}
            <span className="text-xs text-gray-300 bg-black/30 px-2 py-0.5 rounded-full">🗓 PTO (* = rest day)</span>
          </div>

          {/* Export / Import controls */}
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/10">
            <span className="text-xs text-gray-500 font-semibold">Attendance tracking:</span>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-emerald-100 border border-emerald-600 transition-colors"
            >
              ⬇ Export attendance.json
            </button>
            <label className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-sky-800 hover:bg-sky-700 text-sky-100 border border-sky-600 transition-colors cursor-pointer">
              ⬆ Import attendance.json
              <input type="file" accept=".json" onChange={handleImport} className="hidden"/>
            </label>
            {saveStatus === "saved"    && <span className="text-xs text-emerald-400 font-semibold">✓ Exported — now commit attendance.json to git</span>}
            {saveStatus === "imported" && <span className="text-xs text-sky-400 font-semibold">✓ Imported successfully</span>}
            {saveStatus === "error"    && <span className="text-xs text-red-400 font-semibold">✗ Import failed — check file format</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800 bg-gray-900 px-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex gap-0.5 overflow-x-auto">
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`px-3 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${tab===t.id?"border-indigo-500 text-indigo-300":"border-transparent text-gray-500 hover:text-gray-300"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-900/50 border-b border-gray-800 px-4 py-3">
          <div className="max-w-5xl mx-auto space-y-2">
            <div className="flex flex-wrap gap-2 items-center">
              <input type="text" placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-gray-200 text-sm px-3 py-1.5 rounded-lg placeholder-gray-500 focus:outline-none w-28"/>
              <div className="flex flex-wrap gap-1">
                {["All","Lindy","Blues","WCS","Multi"].map(s=>(
                  <button key={s} onClick={()=>setStyleFilter(s)}
                    className={`text-xs px-3 py-1 rounded-full font-semibold border transition-colors ${styleFilter===s?"bg-indigo-700 border-indigo-500 text-white":"bg-gray-800 border-gray-700 text-gray-400"}`}>{s}</button>
                ))}
              </div>
              <select value={regionFilter} onChange={e=>setRegionFilter(e.target.value)} className="bg-gray-800 border border-gray-700 text-gray-300 text-sm px-2 py-1 rounded-lg focus:outline-none">
                {regions.map(r=><option key={r}>{r}</option>)}
              </select>
              {tab==="cards" && (
                <select value={sortBy} onChange={e=>setSortBy(e.target.value)} className="bg-gray-800 border border-gray-700 text-gray-300 text-sm px-2 py-1 rounded-lg focus:outline-none">
                  <option value="vibe">Vibe Score</option>
                  <option value="date">Date</option>
                  <option value="pto">Fewest PTO</option>
                  <option value="social">💃 Social</option>
                  <option value="age">🎂 Age Match</option>
                  <option value="level">⚡ Skill Level</option>
                  <option value="workshop">🎓 Workshop</option>
                  <option value="local">Local First</option>
                </select>
              )}
              <span className="text-xs text-gray-500 ml-auto">{filteredEvents.length} events</span>
            </div>
            {/* Attendance multi-select filter */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-gray-500 font-semibold">Filter by status:</span>
              {ATT.map(a=>(
                <button key={a.v} onClick={()=>toggleAttFilter(a.v)}
                  className={`text-xs px-2.5 py-1 rounded-full border font-semibold transition-colors ${attFilter.includes(a.v)?`${a.bg} ${a.b} ${a.c}`:"bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300"}`}>
                  {a.l}
                </button>
              ))}
              <button onClick={()=>toggleAttFilter("unset")}
                className={`text-xs px-2.5 py-1 rounded-full border font-semibold transition-colors ${attFilter.includes("unset")?"bg-gray-600 border-gray-400 text-gray-200":"bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300"}`}>
                No Status
              </button>
              {attFilter.length>0 && <button onClick={()=>setAttFilter([])} className="text-xs text-gray-500 hover:text-gray-300 underline ml-1">Clear</button>}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {tab==="toppicks" && <TopPicksView events={filteredEvents} attendance={attendance} onAttendance={handleAttendance}/>}
        {tab==="calendar" && <CalendarView events={filteredEvents} attendance={attendance} onAttendance={handleAttendance}/>}
        {tab==="cards" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredEvents.map(e=>(
              <EventCard key={e.id} event={e} expanded={expandedId===e.id}
                onToggle={()=>setExpandedId(expandedId===e.id?null:e.id)}
                attendance={attendance[e.id]} onAttendance={handleAttendance}/>
            ))}
          </div>
        )}
        {tab==="conflicts" && <ConflictsView allEvents={EVENTS} attendance={attendance} onAttendance={handleAttendance}/>}
        {tab==="past"      && <PastView events={pastEvents} attendance={attendance} onAttendance={handleAttendance}/>}
        {tab==="tickets"   && <TicketTracker events={futureEvents} attendance={attendance}/>}
        {tab==="budget"    && <BudgetView events={futureEvents} attendance={attendance}/>}
      </div>

      <div className="text-center text-xs text-gray-600 py-6 border-t border-gray-800">
        Drive limit: ~DC (~7.5 hrs) or Montréal (~5 hrs) · 2027 dates estimated — confirm at official sites · PTO * = includes 1 rest day (Sunday return &gt;3 hrs) · Status saved in your browser
      </div>
    </div>
  );
}
