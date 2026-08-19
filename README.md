# Production Line Simulator V1.1

![Production Line Simulator](assets/Production-Line-Simulator-Icon.png)

[English](#english) · [العربية](#العربية)

## English

A simple browser simulator for production lines. Use it to study processes,
operators, automatic machines, queues, product flow, bottlenecks, and line
capacity. It supports regular, batch, chamber, PCB, and PCBA processes.

## Run the simulator

### Run the simulator — steps

1. Click [**Download the simulator directly**](https://github.com/y-f-yamani/production-line-simulator/releases/download/v1.1.0/Production-Line-Simulator-V1.html).
2. Save the downloaded file on your computer or phone.
3. Open the saved file with Chrome, Edge, Safari, or Firefox.

No Node.js is required.

### Start from the project files

The standalone file is **`release/Production-Line-Simulator-V1.html`**. It is a
complete file for PC and mobile browsers. No installation, server, Node.js, or
internet connection is required.

You can open **`index.html`** when editing the project source.

### Basic use

1. Choose a line template, or start from scratch.
2. Set the product type and target quantity.
3. Add or edit processes.
4. Set manual work, machine time, transfer time, operators, and machines.
5. Press **Pause/Run** and watch the flow.

The next product starts automatically. Products do not skip processes. A process
with a missing required resource stops the line.

### Main rules

- **Cycle:** `max(manual time ÷ operators, machine time ÷ automatic machines)`;
  the larger workload controls a regular process.
- **Capacity:** for a regular process, `3,600 ÷ cycle` units per hour. Batch and
  chamber capacity also depends on duration, batch size, schedule, and equipment.
- **Bottleneck:** the process with the lowest effective capacity.
- **Transfer time:** movement time between processes; it affects completion time
  but does not change the regular-process cycle.
- **Batch/chamber:** several products can start and finish together as one batch.
- **Target quantity:** the number of finished products to make.
- **PCB/PCBA panels:** one panel can become several individual boards at
  depaneling.

### Templates

- **From scratch**
- **HLA**
- **HLA with Chamber and Aging Test**
- **PCB Panel to Individual PCB**
- **PCB Individual Finishing**
- **PCBA Panel to Individual PCBA**
- **PCBA Individual Finishing**

### Files

- **`release/Production-Line-Simulator-V1.html`** — shareable one-file release; the filename stays the same in V1.1
- **`index.html`**, **`styles.css`**, **`app.js`**, **`simulation.js`** — source
- **`assets/`** — product logo and Windows icon
- **`assets/Production-Line-Simulator-LinkedIn.gif`** — short animated demo for social posts
- **`tests/`** — calculation, stress, and interface checks
- **`LICENSE`** — 0BSD license

### Developer

Developed by **Yousuf Yamani** · **15 August 2026**

### License

This project uses the [0BSD license](LICENSE). You may use, copy, modify, and
share it, including commercially. The software is provided as-is.

## العربية

[العودة إلى English](#english)

محاكي بسيط لخطوط الإنتاج يعمل من المتصفح. يساعدك على دراسة العمليات،
والمشغلين، والآلات الأوتوماتيكية، وطوابير الانتظار، وحركة المنتجات، وعنق
الزجاجة، وطاقة الخط. ويدعم العمليات العادية وعمليات الدفعات والغرف وPCB وPCBA.

### التشغيل

### خطوات تشغيل المحاكي

1. اضغط على [**تحميل المحاكي مباشرة**](https://github.com/y-f-yamani/production-line-simulator/releases/download/v1.1.0/Production-Line-Simulator-V1.html).
2. احفظ الملف الذي تم تنزيله على الكمبيوتر أو الهاتف.
3. افتح الملف باستخدام Chrome أو Edge أو Safari أو Firefox.

لا تحتاج إلى Node.js.

افتح أو شارك الملف **`release/Production-Line-Simulator-V1.html`**. هذا ملف واحد
متكامل يعمل على الكمبيوتر والهاتف، ولا يحتاج إلى تثبيت أو خادم أو Node.js أو
اتصال بالإنترنت.

افتح **`index.html`** عند تعديل ملفات المشروع.

### الاستخدام

1. اختر نموذج الخط أو ابدأ من الصفر.
2. اختر نوع المنتج والكمية المطلوبة.
3. أضف العمليات أو عدّلها.
4. أدخل أوقات العمل والنقل وعدد المشغلين والآلات.
5. اضغط **Pause/Run** وشاهد حركة المنتجات.

يبدأ المنتج التالي تلقائياً، ولا يتجاوز أي منتج أي عملية. إذا احتاجت العملية إلى
مورد غير متوفر، يتوقف الخط.

### القواعد الأساسية

- **الدورة:** `max(الوقت اليدوي ÷ عدد المشغلين، وقت الآلة ÷ عدد الآلات
  الأوتوماتيكية)`؛ والقيمة الأكبر تتحكم في العملية العادية.
- **الطاقة:** في العملية العادية `3,600 ÷ زمن الدورة` وحدة في الساعة. أما
  الدفعات والغرف فتتأثر أيضاً بالمدة وحجم الدفعة والجدول وعدد المعدات.
- **عنق الزجاجة:** العملية ذات أقل طاقة فعلية.
- **وقت النقل:** وقت انتقال المنتج بين العمليات؛ يؤثر في وقت الإكمال ولا يغير
  دورة العملية العادية.
- **الدفعة/الغرفة:** يمكن أن تبدأ عدة منتجات وتنتهي معاً كدفعة واحدة.
- **الكمية المطلوبة:** عدد المنتجات النهائية المطلوب إنتاجها.
- **لوحات PCB وPCBA:** يمكن تحويل اللوحة إلى عدة منتجات فردية عند فصل اللوحة.

### النماذج المتاحة

- **من الصفر**
- **HLA**
- **HLA مع Chamber و Aging Test**
- **PCB Panel إلى PCB فردي**
- **PCB فردي**
- **PCBA Panel إلى PCBA فردي**
- **PCBA فردي**

### الملفات

- **`release/Production-Line-Simulator-V1.html`** — ملف الإصدار الواحد للمشاركة؛ يبقى اسم الملف نفسه في V1.1
- **`index.html`** و **`styles.css`** و **`app.js`** و **`simulation.js`** — ملفات المصدر
- **`assets/`** — شعار المنتج وأيقونة Windows
- **`assets/Production-Line-Simulator-LinkedIn.gif`** — فيديو متحرك قصير للمنشورات
- **`tests/`** — اختبارات الحسابات والضغط وواجهة الاستخدام
- **`LICENSE`** — رخصة 0BSD

### المطور

تم التطوير بواسطة **يوسف يماني** · **15 أغسطس 2026**

### الرخصة

المشروع يستخدم رخصة [0BSD](LICENSE)، ويمكن استخدامه ونسخه وتعديله ومشاركته،
بما في ذلك الاستخدام التجاري. البرنامج مقدم كما هو.
