# Production Line Simulator V1.1 — Release Validation

Validation date: **19 August 2026**  
Release file: `release/Production-Line-Simulator-V1.html`

## English

### What is this file?

This is a short release test report. It records what was checked before V1 was
published.

### Why is it useful?

It gives confidence that the simulator is working correctly. It helps the
developer find problems later, repeat the same tests after changes, and show
that the shared one-file release was checked on PC and mobile.

### Result

V1.1 passed the calculation, high-volume, interface, mobile-layout, and
standalone-file checks. No release-blocking problem was found.

### Main checks

- Cycle and capacity formulas were tested with **192** resource combinations.
- A run of **10,000 products** completed without skipped processes.
- A long line with **48 processes** was tested.
- Regular, batch, chamber, PCB, PCBA, and panel-conversion flows were tested.
- Sampled batch processing, scheduled starts, full batches, and final partial
  batches were tested.
- Multiple lines kept their data separate.
- Target quantity was checked from **1 to 10,000** products.
- Desktop size **1265 × 720** and phone size **390 × 844** were checked.
- Mobile scrolling, presentation mode, zoom, frozen dashboard, and line menu
  were checked.
- The standalone HTML file has no external JavaScript or CSS dependency.
- The release file rebuilds successfully from the editable source files.
- No browser console errors or warnings were found during the final check.

### Run the tests again

Node.js is needed only for testing and rebuilding. The simulator itself does not
need Node.js.

```bash
npm test
npm run build
npm test
```

The second test confirms that the standalone file still works after rebuilding.

## العربية

### ما هو هذا الملف؟

هذا تقرير مختصر لاختبار الإصدار. يوضح ما تم فحصه قبل نشر الإصدار V1.1.

### ما فائدته؟

يعطي ثقة بأن المحاكي يعمل بشكل صحيح. يساعد المطور على اكتشاف المشاكل لاحقاً،
وإعادة الاختبارات بعد أي تعديل، وإثبات أن ملف الإصدار الواحد تم اختباره على
الكمبيوتر والهاتف.

### النتيجة

نجح الإصدار V1.1 في اختبارات الحسابات، والكمية الكبيرة من المنتجات، وواجهة
الاستخدام، وتصميم الهاتف، وملف HTML المستقل. لم يتم العثور على مشكلة تمنع النشر.

### أهم الاختبارات

- تم اختبار معادلات الدورة والطاقة مع **192** حالة مختلفة للموارد.
- تم تشغيل **10,000 منتج** بدون تجاوز أي عملية.
- تم اختبار خط طويل يحتوي على **48 عملية**.
- تم اختبار العمليات العادية وعمليات الدفعات والغرف وPCB وPCBA وتحويل اللوحات.
- تم اختبار الدفعات الجزئية، ومواعيد البدء، والدفعات المكتملة، والدفعة الأخيرة.
- احتفظت الخطوط المتعددة ببيانات منفصلة.
- تم اختبار الكمية المطلوبة من **1 إلى 10,000** منتج.
- تم اختبار شاشة الكمبيوتر **1265 × 720** وشاشة الهاتف **390 × 844**.
- تم اختبار التمرير في الهاتف، ووضع العرض، والتكبير، وتثبيت لوحة المعلومات، وقائمة
  إضافة الخط.
- ملف HTML المستقل لا يحتاج إلى ملفات JavaScript أو CSS خارجية.
- تم إعادة بناء ملف الإصدار بنجاح من ملفات المشروع القابلة للتعديل.
- لم تظهر أخطاء أو تحذيرات في وحدة تحكم المتصفح أثناء الاختبار النهائي.

### إعادة الاختبار

يحتاج Node.js إلى الاختبار وإعادة البناء فقط. المحاكي نفسه لا يحتاج إلى Node.js.

```bash
npm test
npm run build
npm test
```

الاختبار الثاني يتأكد من أن ملف HTML المستقل ما زال يعمل بعد إعادة البناء.
