# Production Line Simulator V1

![Production Line Simulator](assets/Production-Line-Simulator-Icon.png)

## English

A simple browser simulator for production lines. Use it to study processes,
operators, automatic machines, queues, product flow, bottlenecks, and line
capacity. It supports regular, batch, chamber, PCB, and PCBA processes.

## Run the simulator

### Run the simulator — steps

1. Click [**Download the simulator directly**](https://github.com/y-f-yamani/production-line-simulator/raw/refs/heads/main/release/Production-Line-Simulator-V1.html).
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

- **Cycle:** the slower workload controls the process.
- **Capacity:** 3,600 divided by cycle time.
- **Bottleneck:** the process with the lowest capacity.
- **Transfer time:** movement time between processes; it does not change cycle.
- **Batch/chamber:** several products can start and finish together.
- **Target quantity:** the number of finished products to make.
- **PCB/PCBA panels:** one panel can become several individual boards at
  depaneling.

### Templates

From scratch · HLA · HLA with Chamber and Aging Test · PCB Panel to Individual
PCB · PCB Individual Finishing · PCBA Panel to Individual PCBA · PCBA Individual
Finishing.

### Files

- **`release/Production-Line-Simulator-V1.html`** — shareable one-file release
- **`index.html`**, **`styles.css`**, **`app.js`**, **`simulation.js`** — source
- **`assets/`** — product logo and Windows icon
- **`tests/`** — calculation, stress, and interface checks
- **`LICENSE`** — 0BSD license

### Developer

Developed by **Yousuf Yamani** · **15 August 2026**

### License

This project uses the [0BSD license](LICENSE). You may use, copy, modify, and
share it, including commercially. The software is provided as-is.

## العربية

محاكي بسيط لخطوط الإنتاج يعمل من المتصفح. يساعدك على دراسة العمليات،
والمشغلين، والآلات الأوتوماتيكية، وطوابير الانتظار، وحركة المنتجات، وعنق
الزجاجة، وطاقة الخط. ويدعم العمليات العادية وعمليات الدفعات والغرف وPCB وPCBA.

### التشغيل

### خطوات تشغيل المحاكي

1. اضغط على [**تحميل المحاكي مباشرة**](https://github.com/y-f-yamani/production-line-simulator/raw/refs/heads/main/release/Production-Line-Simulator-V1.html).
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

- **الدورة:** الوقت الأطول بين عمل المشغل وعمل الآلة.
- **الطاقة:** عدد الوحدات التي يمكن إنتاجها في الساعة.
- **عنق الزجاجة:** العملية ذات أقل طاقة.
- **وقت النقل:** وقت انتقال المنتج ولا يغير زمن الدورة.
- **عملية الدفعة:** يمكن أن تبدأ عدة منتجات وتنتهي معاً.
- **الكمية المطلوبة:** عدد المنتجات النهائية المطلوب إنتاجها.
- **لوحات PCB وPCBA:** يمكن تحويل اللوحة إلى عدة منتجات فردية عند فصل اللوحة.

### المطور

تم التطوير بواسطة **Yousuf Yamani** · **15 أغسطس 2026**

### الرخصة

المشروع يستخدم رخصة [0BSD](LICENSE)، ويمكن استخدامه ونسخه وتعديله ومشاركته،
بما في ذلك الاستخدام التجاري. البرنامج مقدم كما هو.
