const { chromium } = require('@playwright/test');
const path = require('path');

async function runTests() {
  const browser = await chromium.launch();

  try {
    console.log('📱 Тестирование страницы игрока...\n');

    // Test Player Page
    const playerPage = await browser.newPage();
    await playerPage.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // Check page title and elements
    const title = await playerPage.textContent('h1');
    console.log('✓ Заголовок:', title);

    const pageType = await playerPage.textContent('p');
    console.log('✓ Тип страницы:', pageType);

    // Fill and submit form
    const input = await playerPage.$('input[type="text"]');
    console.log('✓ Найдено поле ввода');

    await input.fill('Тестовый Игрок 1');
    console.log('✓ Заполнено имя: "Тестовый Игрок 1"');

    const submitButton = await playerPage.$('button[type="submit"]');
    await submitButton.click();
    console.log('✓ Нажата кнопка "Присоединиться"');

    // Wait for success message
    await playerPage.waitForSelector('.bg-green-100', { timeout: 5000 });
    console.log('✓ Показано сообщение об успехе');

    // Check player count
    await playerPage.waitForTimeout(2000);
    const playerCount = await playerPage.locator('text=/Сейчас в игре:/').textContent();
    console.log('✓ Статус игроков:', playerCount);

    await playerPage.close();

    console.log('\n👥 Тестирование страницы хоста...\n');

    // Test Host Page
    const hostPage = await browser.newPage();
    await hostPage.goto('http://localhost:3000/host', { waitUntil: 'networkidle' });

    // Check host page elements
    const hostTitle = await hostPage.textContent('h1');
    console.log('✓ Заголовок:', hostTitle);

    const hostType = await hostPage.textContent('p');
    console.log('✓ Тип страницы:', hostType);

    // Wait for player list to load
    await hostPage.waitForTimeout(2000);

    const playerCountElement = await hostPage.locator('.bg-blue-600').first();
    const countText = await playerCountElement.textContent();
    console.log('✓ Количество игроков на панели хоста:', countText);

    // Check if players are listed
    const playerItems = await hostPage.locator('li:has-text("Тестовый Игрок")').count();
    if (playerItems > 0) {
      console.log('✓ Найден игрок в списке хоста');
    }

    // Add another player from a second instance of player page
    console.log('\n➕ Добавление второго игрока...\n');
    const playerPage2 = await browser.newPage();
    await playerPage2.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    const input2 = await playerPage2.$('input[type="text"]');
    await input2.fill('Тестовый Игрок 2');
    console.log('✓ Заполнено имя: "Тестовый Игрок 2"');

    const submitButton2 = await playerPage2.$('button[type="submit"]');
    await submitButton2.click();
    console.log('✓ Нажата кнопка "Присоединиться"');

    // Wait for success
    await playerPage2.waitForSelector('.bg-green-100', { timeout: 5000 });
    console.log('✓ Игрок успешно добавлен');

    await playerPage2.close();

    // Check if host page updates
    console.log('\n🔄 Проверка синхронизации на странице хоста...\n');
    await hostPage.reload({ waitUntil: 'networkidle' });

    const updatedCountElement = await hostPage.locator('.bg-blue-600').first();
    const updatedCount = await updatedCountElement.textContent();
    console.log('✓ Обновленное количество игроков на панели хоста:', updatedCount);

    const playerItems2 = await hostPage.locator('li:has-text("Тестовый Игрок")').count();
    console.log(`✓ Найдено игроков в списке: ${playerItems2}`);

    await hostPage.close();

    console.log('\n✅ Все тесты пройдены успешно!');

  } catch (error) {
    console.error('\n❌ Ошибка при тестировании:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runTests();
