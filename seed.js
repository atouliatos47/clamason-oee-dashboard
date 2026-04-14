require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ── ALL OEE DATA (Wk 13, 14, 15) ─────────────────────────────────────────────
const OEE = {
  "Wk 13": [
    {machine:"Bihler",planned_down_h:168.0,net_avail_h:0.0,unplanned_h:0.0,run_h:0.0,avail:0.0,perf:0.0,quality:0.0,oee:0.0,total_parts:0},
    {machine:"Bruderer 1",planned_down_h:57.13,net_avail_h:110.85,unplanned_h:29.08,run_h:79.97,avail:72.1,perf:101.2,quality:100.0,oee:73.0,total_parts:4855940},
    {machine:"Bruderer 2",planned_down_h:56.35,net_avail_h:111.63,unplanned_h:35.25,run_h:74.58,avail:66.8,perf:103.2,quality:100.0,oee:69.0,total_parts:4566452},
    {machine:"Bruderer 3",planned_down_h:92.92,net_avail_h:75.07,unplanned_h:23.25,run_h:51.82,avail:69.0,perf:95.4,quality:100.0,oee:65.9,total_parts:1431314},
    {machine:"Bruderer 60T ISI73",planned_down_h:134.83,net_avail_h:33.15,unplanned_h:19.37,run_h:13.78,avail:41.6,perf:120.0,quality:97.6,oee:48.8,total_parts:115763},
    {machine:"Chin Fong 110 ISI1",planned_down_h:113.1,net_avail_h:54.88,unplanned_h:5.8,run_h:49.07,avail:89.4,perf:74.8,quality:100.0,oee:66.8,total_parts:88065},
    {machine:"Chin Fong 110 ISI74",planned_down_h:151.5,net_avail_h:16.48,unplanned_h:14.17,run_h:2.28,avail:13.9,perf:71.3,quality:100.0,oee:9.9,total_parts:1132},
    {machine:"Finzer Line 16",planned_down_h:168.0,net_avail_h:0.0,unplanned_h:0.0,run_h:0.0,avail:0.0,perf:0.0,quality:0.0,oee:0.0,total_parts:0},
    {machine:"Finzer Line 17",planned_down_h:124.9,net_avail_h:43.08,unplanned_h:17.03,run_h:18.05,avail:41.9,perf:99.2,quality:100.0,oee:41.5,total_parts:123548},
    {machine:"Finzer Line 18",planned_down_h:89.35,net_avail_h:78.63,unplanned_h:24.5,run_h:28.58,avail:36.4,perf:70.9,quality:100.0,oee:25.8,total_parts:127634},
    {machine:"Finzer Line 19",planned_down_h:167.88,net_avail_h:0.1,unplanned_h:0.1,run_h:0.0,avail:0.0,perf:0.0,quality:0.0,oee:0.0,total_parts:0},
    {machine:"Finzer Line 20",planned_down_h:135.13,net_avail_h:32.85,unplanned_h:32.85,run_h:0.0,avail:0.0,perf:0.0,quality:0.0,oee:0.0,total_parts:0},
    {machine:"Heenan 1",planned_down_h:116.82,net_avail_h:51.17,unplanned_h:31.02,run_h:20.15,avail:39.4,perf:165.1,quality:99.9,oee:64.9,total_parts:129721},
    {machine:"Heenan 2",planned_down_h:135.48,net_avail_h:32.5,unplanned_h:32.47,run_h:0.03,avail:0.1,perf:98.8,quality:100.0,oee:0.1,total_parts:167},
    {machine:"Heenan 3",planned_down_h:112.6,net_avail_h:55.38,unplanned_h:24.33,run_h:31.05,avail:56.1,perf:100.7,quality:100.0,oee:56.5,total_parts:121973},
    {machine:"HME 20T A ISI23",planned_down_h:156.63,net_avail_h:11.35,unplanned_h:11.35,run_h:0.0,avail:0.0,perf:0.0,quality:0.0,oee:0.0,total_parts:0},
    {machine:"HME 20T C ISI22",planned_down_h:168.0,net_avail_h:0.0,unplanned_h:0.0,run_h:0.0,avail:0.0,perf:0.0,quality:0.0,oee:0.0,total_parts:0},
    {machine:"Kaiser 50T 1",planned_down_h:106.57,net_avail_h:61.42,unplanned_h:14.88,run_h:46.53,avail:75.8,perf:100.0,quality:100.0,oee:75.7,total_parts:738285},
    {machine:"Kaiser 50T 2",planned_down_h:144.57,net_avail_h:23.42,unplanned_h:17.43,run_h:5.97,avail:25.5,perf:92.1,quality:100.0,oee:23.5,total_parts:30771},
    {machine:"Rockwell 1",planned_down_h:159.78,net_avail_h:8.2,unplanned_h:3.05,run_h:5.15,avail:62.8,perf:87.8,quality:100.0,oee:55.1,total_parts:16280}
  ],
  "Wk 14": [
    {machine:"Bihler",planned_down_h:168.0,net_avail_h:0.0,unplanned_h:0.0,run_h:0.0,avail:0.0,perf:0.0,quality:0.0,oee:0.0,total_parts:0},
    {machine:"Bruderer 1",planned_down_h:78.23,net_avail_h:89.75,unplanned_h:16.58,run_h:71.98,avail:80.2,perf:102.0,quality:100.0,oee:81.8,total_parts:4404616},
    {machine:"Bruderer 2",planned_down_h:79.9,net_avail_h:88.08,unplanned_h:26.3,run_h:47.32,avail:53.7,perf:101.2,quality:100.0,oee:54.4,total_parts:2363806},
    {machine:"Bruderer 3",planned_down_h:120.22,net_avail_h:47.77,unplanned_h:10.05,run_h:37.7,avail:78.9,perf:99.0,quality:100.0,oee:78.1,total_parts:671950},
    {machine:"Bruderer 60T ISI73",planned_down_h:148.48,net_avail_h:19.5,unplanned_h:8.22,run_h:11.28,avail:57.9,perf:97.8,quality:99.9,oee:56.6,total_parts:79503},
    {machine:"Chin Fong 110 ISI1",planned_down_h:131.13,net_avail_h:36.85,unplanned_h:11.98,run_h:24.85,avail:67.5,perf:66.4,quality:100.0,oee:44.8,total_parts:13279},
    {machine:"Chin Fong 110 ISI74",planned_down_h:159.28,net_avail_h:8.7,unplanned_h:3.38,run_h:5.32,avail:61.1,perf:75.9,quality:69.3,oee:32.1,total_parts:2593},
    {machine:"Finzer Line 16",planned_down_h:168.0,net_avail_h:0.0,unplanned_h:0.0,run_h:0.0,avail:0.0,perf:0.0,quality:0.0,oee:0.0,total_parts:0},
    {machine:"Finzer Line 17",planned_down_h:165.85,net_avail_h:2.13,unplanned_h:2.13,run_h:0.0,avail:0.0,perf:0.0,quality:0.0,oee:0.0,total_parts:0},
    {machine:"Finzer Line 18",planned_down_h:167.45,net_avail_h:0.53,unplanned_h:0.53,run_h:0.0,avail:0.0,perf:0.0,quality:0.0,oee:0.0,total_parts:0},
    {machine:"Finzer Line 19",planned_down_h:164.83,net_avail_h:3.15,unplanned_h:3.15,run_h:0.0,avail:0.0,perf:0.0,quality:0.0,oee:0.0,total_parts:0},
    {machine:"Finzer Line 20",planned_down_h:168.0,net_avail_h:0.0,unplanned_h:0.0,run_h:0.0,avail:0.0,perf:0.0,quality:0.0,oee:0.0,total_parts:0},
    {machine:"Heenan 1",planned_down_h:168.0,net_avail_h:0.0,unplanned_h:0.0,run_h:0.0,avail:0.0,perf:0.0,quality:0.0,oee:0.0,total_parts:0},
    {machine:"Heenan 2",planned_down_h:139.4,net_avail_h:28.58,unplanned_h:3.83,run_h:24.73,avail:86.6,perf:103.5,quality:100.0,oee:89.6,total_parts:99839},
    {machine:"Heenan 3",planned_down_h:129.23,net_avail_h:38.75,unplanned_h:0.9,run_h:37.83,avail:97.7,perf:99.9,quality:100.0,oee:97.5,total_parts:147418},
    {machine:"HME 20T A ISI23",planned_down_h:162.83,net_avail_h:5.15,unplanned_h:5.15,run_h:0.0,avail:0.1,perf:38.2,quality:100.0,oee:0.0,total_parts:7},
    {machine:"HME 20T C ISI22",planned_down_h:168.0,net_avail_h:0.0,unplanned_h:0.0,run_h:0.0,avail:0.0,perf:0.0,quality:0.0,oee:0.0,total_parts:0},
    {machine:"Kaiser 50T 1",planned_down_h:136.45,net_avail_h:31.53,unplanned_h:16.28,run_h:14.48,avail:46.0,perf:93.6,quality:100.0,oee:43.0,total_parts:219740},
    {machine:"Kaiser 50T 2",planned_down_h:153.9,net_avail_h:14.08,unplanned_h:9.88,run_h:4.2,avail:29.8,perf:91.4,quality:100.0,oee:27.2,total_parts:21350},
    {machine:"Rockwell 1",planned_down_h:146.3,net_avail_h:21.68,unplanned_h:10.58,run_h:11.1,avail:51.2,perf:84.2,quality:100.0,oee:43.1,total_parts:35912}
  ],
  "Wk 15": [
    {machine:"Bihler",planned_down_h:168.0,net_avail_h:0.0,unplanned_h:0.0,run_h:0.0,avail:0.0,perf:0.0,quality:100.0,oee:0.0,total_parts:540},
    {machine:"Bruderer 1",planned_down_h:80.23,net_avail_h:87.75,unplanned_h:32.7,run_h:54.42,avail:62.0,perf:101.9,quality:100.0,oee:63.2,total_parts:3328094},
    {machine:"Bruderer 2",planned_down_h:57.13,net_avail_h:110.85,unplanned_h:17.5,run_h:92.92,avail:83.8,perf:101.7,quality:100.0,oee:85.2,total_parts:5285530},
    {machine:"Bruderer 3",planned_down_h:97.17,net_avail_h:70.82,unplanned_h:15.08,run_h:55.73,avail:78.7,perf:98.8,quality:100.0,oee:77.7,total_parts:912906},
    {machine:"Bruderer 60T ISI73",planned_down_h:128.23,net_avail_h:39.75,unplanned_h:11.38,run_h:28.35,avail:71.3,perf:97.7,quality:100.0,oee:69.7,total_parts:196909},
    {machine:"Chin Fong 110 ISI1",planned_down_h:114.02,net_avail_h:53.97,unplanned_h:9.42,run_h:44.43,avail:82.3,perf:55.1,quality:100.0,oee:45.4,total_parts:12498},
    {machine:"Chin Fong 110 ISI74",planned_down_h:148.98,net_avail_h:19.0,unplanned_h:10.95,run_h:8.03,avail:42.3,perf:86.2,quality:100.0,oee:36.5,total_parts:19376},
    {machine:"Finzer Line 16",planned_down_h:135.58,net_avail_h:32.42,unplanned_h:32.42,run_h:0.0,avail:0.0,perf:0.0,quality:0.0,oee:0.0,total_parts:0},
    {machine:"Finzer Line 17",planned_down_h:108.7,net_avail_h:59.28,unplanned_h:16.88,run_h:42.38,avail:71.5,perf:98.9,quality:100.0,oee:70.7,total_parts:289390},
    {machine:"Finzer Line 18",planned_down_h:168.0,net_avail_h:0.0,unplanned_h:0.0,run_h:0.0,avail:0.0,perf:0.0,quality:100.0,oee:0.0,total_parts:270},
    {machine:"Finzer Line 19",planned_down_h:168.0,net_avail_h:0.0,unplanned_h:0.0,run_h:0.0,avail:0.0,perf:0.0,quality:0.0,oee:0.0,total_parts:0},
    {machine:"Finzer Line 20",planned_down_h:85.08,net_avail_h:82.9,unplanned_h:68.5,run_h:0.18,avail:0.2,perf:129.6,quality:100.0,oee:0.3,total_parts:1244},
    {machine:"Heenan 2",planned_down_h:137.72,net_avail_h:30.27,unplanned_h:20.13,run_h:10.13,avail:33.5,perf:100.4,quality:100.0,oee:33.6,total_parts:39717},
    {machine:"Heenan 3",planned_down_h:123.63,net_avail_h:44.35,unplanned_h:13.32,run_h:31.02,avail:70.0,perf:99.6,quality:100.0,oee:69.7,total_parts:120517},
    {machine:"HME 20T A ISI23",planned_down_h:153.72,net_avail_h:14.27,unplanned_h:8.87,run_h:5.38,avail:37.8,perf:77.1,quality:100.0,oee:29.1,total_parts:24961},
    {machine:"HME 20T C ISI22",planned_down_h:157.45,net_avail_h:10.53,unplanned_h:2.1,run_h:8.43,avail:80.0,perf:107.5,quality:100.0,oee:86.0,total_parts:14980},
    {machine:"Kaiser 50T 1",planned_down_h:129.08,net_avail_h:38.9,unplanned_h:24.35,run_h:14.22,avail:36.6,perf:101.1,quality:100.0,oee:37.0,total_parts:99321},
    {machine:"Kaiser 50T 2",planned_down_h:121.73,net_avail_h:46.25,unplanned_h:30.25,run_h:15.98,avail:34.6,perf:94.8,quality:100.0,oee:32.8,total_parts:122147},
    {machine:"Rockwell 1",planned_down_h:168.0,net_avail_h:0.0,unplanned_h:0.0,run_h:0.0,avail:0.0,perf:0.0,quality:0.0,oee:0.0,total_parts:0}
  ]
};

// ── AGILITY DATA ──────────────────────────────────────────────────────────────
const AGILITY_PERIOD = 'Apr 2025 - Apr 2026';
const AGILITY = [
  {code:"000038",name:"HEENAN MULTIFORM",cost_labour:7280,labour_hrs:309.8,num_jobs:17,downtime_hrs:309.1,tpm_count:11,breakdown_count:6,breakdowns:[{wo:"033384",desc:"Fuse gone in main panel",labour_hrs:267.4,downtime_hrs:267.5,cost_labour:6285},{wo:"032866",desc:"Faulty plug on main air solenoid",labour_hrs:23.6,downtime_hrs:23.6,cost_labour:555},{wo:"032857",desc:"Solenoid valve not working on incoming air supply",labour_hrs:16.8,downtime_hrs:16.8,cost_labour:394}]},
  {code:"000040",name:"HEENAN MULTIFORM",cost_labour:19,labour_hrs:0.8,num_jobs:11,downtime_hrs:0,tpm_count:11,breakdown_count:0,breakdowns:[]},
  {code:"000057",name:"HEENAN MULTIFORM",cost_labour:322,labour_hrs:13.7,num_jobs:5,downtime_hrs:0,tpm_count:0,breakdown_count:5,breakdowns:[]},
  {code:"000074",name:"BIHLER MULTIFORM",cost_labour:23,labour_hrs:1.0,num_jobs:13,downtime_hrs:0,tpm_count:12,breakdown_count:1,breakdowns:[]},
  {code:"000082",name:"ROCKWELL MULTISLIDE",cost_labour:2272,labour_hrs:96.7,num_jobs:3,downtime_hrs:0,tpm_count:0,breakdown_count:3,breakdowns:[]},
  {code:"00009",name:"CHIN FONG OCP 110 TON ISI 1",cost_labour:1319,labour_hrs:56.1,num_jobs:22,downtime_hrs:1.8,tpm_count:13,breakdown_count:9,breakdowns:[{wo:"031720",desc:"Press will not start up",labour_hrs:0.8,downtime_hrs:0.8,cost_labour:20},{wo:"032903",desc:"Light guards won't reset and errors on machine",labour_hrs:0.5,downtime_hrs:0.5,cost_labour:11},{wo:"032473",desc:"Decoiler not feeding material",labour_hrs:0.3,downtime_hrs:0.3,cost_labour:6}]},
  {code:"00024",name:"HME G20 ISI 22",cost_labour:734,labour_hrs:31.2,num_jobs:24,downtime_hrs:25.5,tpm_count:13,breakdown_count:11,breakdowns:[{wo:"032752",desc:"Tool probe keeps knocking out",labour_hrs:21.2,downtime_hrs:21.2,cost_labour:498},{wo:"032700",desc:"Bulb gone in rear of press",labour_hrs:2.9,downtime_hrs:2.9,cost_labour:69},{wo:"032302",desc:"Oil leak on drip feed pump",labour_hrs:0.8,downtime_hrs:0.8,cost_labour:19}]},
  {code:"00025",name:"HME GH20 ISI 23",cost_labour:1424,labour_hrs:60.6,num_jobs:27,downtime_hrs:56.4,tpm_count:14,breakdown_count:13,breakdowns:[{wo:"033695",desc:"Decoiler won't start up",labour_hrs:42.1,downtime_hrs:42.1,cost_labour:990},{wo:"032436",desc:"Rotary valve leaking to clutch",labour_hrs:5.4,downtime_hrs:5.4,cost_labour:126},{wo:"033360",desc:"Retaining bolt sheared on inner flywheel guard",labour_hrs:2.7,downtime_hrs:2.8,cost_labour:64}]},
  {code:"00029",name:"KAISER V50W TON ISI 32",cost_labour:9291,labour_hrs:395.4,num_jobs:27,downtime_hrs:372.0,tpm_count:15,breakdown_count:12,breakdowns:[{wo:"033248",desc:"Machine stopping due to guard indicator",labour_hrs:308.9,downtime_hrs:310.9,cost_labour:7260},{wo:"032430",desc:"Timing belt broken on crankshaft",labour_hrs:18.1,downtime_hrs:43.9,cost_labour:425},{wo:"033039",desc:"Hinge on door broken on press",labour_hrs:16.2,downtime_hrs:16.2,cost_labour:380}]},
  {code:"00030",name:"KAISER V50W TON ISI 33",cost_labour:8738,labour_hrs:371.8,num_jobs:23,downtime_hrs:306.1,tpm_count:14,breakdown_count:9,breakdowns:[{wo:"032412",desc:"Decoiler not feeding material",labour_hrs:260.7,downtime_hrs:286.0,cost_labour:6126},{wo:"032741",desc:"Press cut out alarm sounding",labour_hrs:17.9,downtime_hrs:18.0,cost_labour:421},{wo:"032441",desc:"Excessive oil leaking from lubrication pump",labour_hrs:1.6,downtime_hrs:1.7,cost_labour:38}]},
  {code:"00031",name:"BRUDERER BSTA 250 ISI 37",cost_labour:2487,labour_hrs:105.8,num_jobs:35,downtime_hrs:443.8,tpm_count:12,breakdown_count:23,breakdowns:[{wo:"031665",desc:"Press ram out of alignment",labour_hrs:0,downtime_hrs:290.7,cost_labour:0},{wo:"033710",desc:"Tight loop sensor has failed",labour_hrs:76.0,downtime_hrs:78.0,cost_labour:1785},{wo:"031715",desc:"Replace slit air pipe",labour_hrs:0,downtime_hrs:69.4,cost_labour:0}]},
  {code:"00032",name:"BRUDERER BSTA 30 ISI 38",cost_labour:1723,labour_hrs:73.3,num_jobs:31,downtime_hrs:188.7,tpm_count:13,breakdown_count:18,breakdowns:[{wo:"032687",desc:"Fit motor to machine",labour_hrs:18.1,downtime_hrs:113.2,cost_labour:425},{wo:"032438",desc:"Main breaker tripping, smell of burning",labour_hrs:21.7,downtime_hrs:25.0,cost_labour:510},{wo:"033643",desc:"Guard switches causing production issues",labour_hrs:0.1,downtime_hrs:18.2,cost_labour:1}]},
  {code:"00043",name:"BRUDERER 60H ISI 73",cost_labour:2103,labour_hrs:89.5,num_jobs:31,downtime_hrs:3.2,tpm_count:16,breakdown_count:15,breakdowns:[{wo:"032107",desc:"Pin snapped on feeder arm",labour_hrs:2.9,downtime_hrs:1.5,cost_labour:69},{wo:"031962",desc:"Rear guard locking shoot bolt stuck",labour_hrs:0.4,downtime_hrs:0.4,cost_labour:10}]},
  {code:"00044",name:"CHIN FONG SC1 110 TON ISI 74",cost_labour:1372,labour_hrs:58.4,num_jobs:27,downtime_hrs:1.2,tpm_count:12,breakdown_count:15,breakdowns:[{wo:"031858",desc:"Motor won't start",labour_hrs:0.6,downtime_hrs:0.6,cost_labour:13},{wo:"032852",desc:"Strip lubricator not working",labour_hrs:0.4,downtime_hrs:0.4,cost_labour:10}]},
  {code:"00046",name:"BRUDERER BSTA 250 ISI 77",cost_labour:221,labour_hrs:9.4,num_jobs:24,downtime_hrs:215.2,tpm_count:13,breakdown_count:11,breakdowns:[{wo:"033007",desc:"Thread stripped on release bolt locking nut",labour_hrs:1.4,downtime_hrs:118.9,cost_labour:33},{wo:"032831",desc:"Main drive forward/reverse feed module fault",labour_hrs:1.1,downtime_hrs:96.0,cost_labour:25}]},
  {code:"00047",name:"BRUDERER BSTA 30 ISI 78",cost_labour:510,labour_hrs:21.7,num_jobs:20,downtime_hrs:20.5,tpm_count:12,breakdown_count:8,breakdowns:[{wo:"032581",desc:"Top stop button not working",labour_hrs:20.1,downtime_hrs:20.2,cost_labour:473}]},
  {code:"00016",name:"BRUDERER 25T UL ISI 10",cost_labour:1136,labour_hrs:48.3,num_jobs:24,downtime_hrs:411.9,tpm_count:12,breakdown_count:12,breakdowns:[{wo:"031717",desc:"Counter on Box changer not working",labour_hrs:16.2,downtime_hrs:231.9,cost_labour:382},{wo:"033518",desc:"Encoder fault - TDC angular encoder damaged",labour_hrs:0,downtime_hrs:137.8,cost_labour:0},{wo:"033181",desc:"Shaker motor won't start",labour_hrs:20.6,downtime_hrs:20.6,cost_labour:484}]},
  {code:"00375",name:"Finzer Modul",cost_labour:1593,labour_hrs:67.8,num_jobs:28,downtime_hrs:121.4,tpm_count:16,breakdown_count:12,breakdowns:[{wo:"032747",desc:"Feeder adjustment damaged",labour_hrs:0.1,downtime_hrs:93.1,cost_labour:3},{wo:"032311",desc:"Thread stripped on feeder unit",labour_hrs:1.8,downtime_hrs:19.2,cost_labour:42}]},
  {code:"00376",name:"Finzer Modul",cost_labour:4279,labour_hrs:182.1,num_jobs:27,downtime_hrs:787.9,tpm_count:15,breakdown_count:12,breakdowns:[{wo:"033205",desc:"Motor dropped speed and won't increase",labour_hrs:18.9,downtime_hrs:572.0,cost_labour:445},{wo:"032011",desc:"Motor slowing and won't adjust speed",labour_hrs:18.4,downtime_hrs:143.7,cost_labour:432},{wo:"032654",desc:"Tapping unit not driving taps",labour_hrs:0.7,downtime_hrs:68.3,cost_labour:16}]},
  {code:"00378",name:"Finzer Modul",cost_labour:4148,labour_hrs:176.5,num_jobs:22,downtime_hrs:70.4,tpm_count:12,breakdown_count:10,breakdowns:[{wo:"032022",desc:"Weld unit getting hot",labour_hrs:67.3,downtime_hrs:67.3,cost_labour:1582}]},
  {code:"00379",name:"Finzer Modul",cost_labour:6271,labour_hrs:266.8,num_jobs:27,downtime_hrs:139.8,tpm_count:16,breakdown_count:11,breakdowns:[{wo:"031731",desc:"Fit replacement pressure switch to vacuum pump",labour_hrs:0.1,downtime_hrs:48.1,cost_labour:2},{wo:"033276",desc:"Machine won't inch forward",labour_hrs:42.8,downtime_hrs:42.8,cost_labour:1006}]},
  {code:"00383",name:"Finzer Modul",cost_labour:1203,labour_hrs:51.2,num_jobs:23,downtime_hrs:339.1,tpm_count:14,breakdown_count:9,breakdowns:[{wo:"033733",desc:"Servo drive error F401",labour_hrs:0,downtime_hrs:337.8,cost_labour:0}]},
  {code:"00231",name:"ROCKWELL MULTISLIDE",cost_labour:1142,labour_hrs:48.6,num_jobs:10,downtime_hrs:771.9,tpm_count:0,breakdown_count:10,breakdowns:[{wo:"032737",desc:"Fault with gearbox on drive unit",labour_hrs:4.8,downtime_hrs:771.5,cost_labour:113}]},
  {code:"00142",name:"PERO V2 Degreaser",cost_labour:5470,labour_hrs:232.8,num_jobs:57,downtime_hrs:242.6,tpm_count:18,breakdown_count:39,breakdowns:[{wo:"032912",desc:"Heating not coming on",labour_hrs:121.9,downtime_hrs:163.3,cost_labour:2865},{wo:"032109",desc:"Door not opening or closing",labour_hrs:23.7,downtime_hrs:23.8,cost_labour:558}]},
  {code:"00144",name:"PERO RO Degreaser",cost_labour:942,labour_hrs:40.1,num_jobs:48,downtime_hrs:725.8,tpm_count:16,breakdown_count:32,breakdowns:[{wo:"033301",desc:"Process chamber door will not close",labour_hrs:15.2,downtime_hrs:689.5,cost_labour:356},{wo:"033595",desc:"Vacuum in process chamber not reached",labour_hrs:2.0,downtime_hrs:23.4,cost_labour:48}]}
];

async function seed() {
  const client = await pool.connect();
  try {
    // Create tables if needed
    await client.query(`
      CREATE TABLE IF NOT EXISTS oee_data (
        id SERIAL PRIMARY KEY, week_label VARCHAR(20) NOT NULL, machine VARCHAR(100) NOT NULL,
        planned_down_h NUMERIC(8,2) DEFAULT 0, net_avail_h NUMERIC(8,2) DEFAULT 0,
        unplanned_h NUMERIC(8,2) DEFAULT 0, run_h NUMERIC(8,2) DEFAULT 0,
        avail NUMERIC(6,2) DEFAULT 0, perf NUMERIC(6,2) DEFAULT 0,
        quality NUMERIC(6,2) DEFAULT 0, oee NUMERIC(6,2) DEFAULT 0,
        total_parts BIGINT DEFAULT 0, uploaded_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(week_label, machine)
      );
      CREATE TABLE IF NOT EXISTS agility_data (
        id SERIAL PRIMARY KEY, period_label VARCHAR(50) NOT NULL, code VARCHAR(20) NOT NULL,
        name VARCHAR(150) NOT NULL, cost_labour NUMERIC(10,2) DEFAULT 0,
        labour_hrs NUMERIC(8,2) DEFAULT 0, num_jobs INTEGER DEFAULT 0,
        downtime_hrs NUMERIC(8,2) DEFAULT 0, tpm_count INTEGER DEFAULT 0,
        breakdown_count INTEGER DEFAULT 0, breakdowns JSONB DEFAULT '[]',
        uploaded_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(period_label, code)
      );
    `);

    // Seed OEE
    let oeeCount = 0;
    for (const [week, rows] of Object.entries(OEE)) {
      for (const m of rows) {
        await client.query(`
          INSERT INTO oee_data (week_label,machine,planned_down_h,net_avail_h,unplanned_h,run_h,avail,perf,quality,oee,total_parts)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
          ON CONFLICT (week_label,machine) DO UPDATE SET
            planned_down_h=EXCLUDED.planned_down_h, net_avail_h=EXCLUDED.net_avail_h,
            unplanned_h=EXCLUDED.unplanned_h, run_h=EXCLUDED.run_h,
            avail=EXCLUDED.avail, perf=EXCLUDED.perf, quality=EXCLUDED.quality,
            oee=EXCLUDED.oee, total_parts=EXCLUDED.total_parts, uploaded_at=NOW()
        `, [week, m.machine, m.planned_down_h, m.net_avail_h, m.unplanned_h,
            m.run_h, m.avail, m.perf, m.quality, m.oee, m.total_parts]);
        oeeCount++;
      }
    }
    console.log(`✅ OEE data seeded: ${oeeCount} rows across ${Object.keys(OEE).length} weeks`);

    // Seed Agility
    let agCount = 0;
    for (const m of AGILITY) {
      await client.query(`
        INSERT INTO agility_data (period_label,code,name,cost_labour,labour_hrs,num_jobs,downtime_hrs,tpm_count,breakdown_count,breakdowns)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (period_label,code) DO UPDATE SET
          name=EXCLUDED.name, cost_labour=EXCLUDED.cost_labour, labour_hrs=EXCLUDED.labour_hrs,
          num_jobs=EXCLUDED.num_jobs, downtime_hrs=EXCLUDED.downtime_hrs,
          tpm_count=EXCLUDED.tpm_count, breakdown_count=EXCLUDED.breakdown_count,
          breakdowns=EXCLUDED.breakdowns, uploaded_at=NOW()
      `, [AGILITY_PERIOD, m.code, m.name, m.cost_labour, m.labour_hrs, m.num_jobs,
          m.downtime_hrs, m.tpm_count, m.breakdown_count, JSON.stringify(m.breakdowns)]);
      agCount++;
    }
    console.log(`✅ Agility data seeded: ${agCount} machines`);
    console.log('🎉 All done! Refresh http://localhost:3011');

  } catch (err) {
    console.error('❌ Seed error:', err.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

seed();
