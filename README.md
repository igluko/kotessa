**Техническое задание: Сайт-сюрприз с колесом фортуны**

### **Описание проекта**
Создать одностраничный сайт-сюрприз, доступный по ссылке, предназначенный для вручения подарка жене. Основной функционал сайта — интерактивное колесо фортуны, которое визуально имитирует случайный выбор приза, но всегда останавливается на заранее определенном подарке.

### **Функциональные требования**
1. **Дизайн и интерфейс**:
   - Фон в нежных розово-сиреневых тонах (градиент);
   - Заголовок: "Дорогая Котесса, крути колесо и узнай свой подарок!";
   - Центр экрана: изображение колеса фортуны (файл `wheel.png`);
   - Указатель (стрелка) над колесом;
   - Кнопка "Крутить!" под колесом.

2. **Механика колеса**:
   - При первом нажатии на кнопку колесо начинает вращение;
   - Оно совершает 8 полных оборотов и почти останавливается **на соседнем секторе перед подарком**;
   - Затем через мгновение колесо докручивается до заранее выбранного сектора (LOVENSE Mini Sex Machine);
   - После окончательной остановки колеса отображается сообщение "Твой подарок: LOVENSE Mini Sex Machine!";
   - Конфетти-анимация при отображении сообщения.

3. **Ограничение повторных запусков**:
   - Кнопка "Крутить!" становится неактивной после первого запуска колеса;
   - При перезагрузке страницы колесо возвращается в исходное состояние, но не дает возможности пользователю повторно вращать его без обновления страницы.

### **Технические требования**
1. **Фронтенд**:
   - HTML, CSS, JavaScript (без бэкенда);
   - Использование **GSAP** для анимации вращения колеса;
   - Использование **canvas-confetti** для анимации конфетти.

2. **Скрипты и загрузка ресурсов**:
   - GSAP подключается через CDN (`cdnjs.cloudflare.com`);
   - Confetti подключается через CDN (`jsdelivr.net`);
   - Убедиться, что оба скрипта загружаются корректно перед их использованием.

3. **Оптимизация и совместимость**:
   - Код не должен вызывать ошибок при загрузке;
   - Поддержка современных браузеров (Chrome, Firefox, Edge, Safari);
   - Корректная работа на мобильных устройствах.

### **Дополнительные требования**
- В коде должны быть комментарии, поясняющие ключевые моменты реализации.

**Ожидаемый результат:**

Готовая HTML-страница, доступная по ссылке, полностью соответствующая требованиям, с анимацией вращения колеса, **остановкой перед подарком с последующим докручиванием**, конфетти и ограничением на повторное использование кнопки после первого клика.
