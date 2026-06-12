const ORDERS_SHEET_NAME = 'Orders';
const PRODUCTS_SHEET_NAME = 'Products';
const DASHBOARD_SHEET_NAME = 'Dashboard';
const ADMINS_SHEET_NAME = 'Admins';
const APP_VERSION = 'streetcart-admin-login-v3';

const ORDER_HEADERS = [
  'Order ID',
  'Created At',
  'Customer Name',
  'Phone',
  'Address',
  'Items',
  'Subtotal',
  'Delivery Fee',
  'Total',
  'Payment Method',
  'Payment Status',
  'Notes',
  'UPI ID',
  'UPI Reference',
  'Admin Verification',
  'Fulfillment Status',
  'Script Version',
];

const PRODUCT_HEADERS = ['ID', 'Name', 'Category', 'Price', 'Image', 'Sizes', 'Stock', 'Active'];
const ADMIN_HEADERS = ['Email', 'Password', 'Name', 'Active'];

const SAMPLE_ADMINS = [['admin@example.com', 'admin123', 'Store Admin', true]];

const SAMPLE_PRODUCTS = [
  [
    1,
    'Sprint Runner Sneakers',
    'Shoes',
    2499,
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
    '7,8,9,10',
    12,
    true,
  ],
  [
    2,
    'Classic White Shirt',
    'Shirts',
    1299,
    'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=80',
    'S,M,L,XL',
    20,
    true,
  ],
  [
    3,
    'Slim Fit Denim Pants',
    'Pants',
    1799,
    'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=80',
    '30,32,34,36',
    15,
    true,
  ],
  [
    4,
    'Everyday Graphic Tee',
    'Shirts',
    899,
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
    'S,M,L,XL',
    25,
    true,
  ],
  [
    5,
    'Street Cargo Pants',
    'Pants',
    1999,
    'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=80',
    '30,32,34,36',
    10,
    true,
  ],
  [
    6,
    'Canvas Tote Bag',
    'Accessories',
    699,
    'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=900&q=80',
    'Free',
    30,
    true,
  ],
];

function doGet(event) {
  const action = event && event.parameter && event.parameter.action;
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const callback = event && event.parameter && event.parameter.callback;

  if (action === 'products') {
    const productsSheet = getProductsSheet_();

    return response_({
      ok: true,
      version: APP_VERSION,
      products: readProducts_(productsSheet),
    }, callback);
  }

  if (action === 'adminLogin') {
    const isValidAdmin = validateAdmin_(event.parameter.email, event.parameter.password);
    return response_({
      ok: isValidAdmin,
      message: isValidAdmin ? 'Login successful.' : 'Invalid email or password.',
    }, callback);
  }

  if (action === 'adminData') {
    if (!validateAdmin_(event.parameter.email, event.parameter.password)) {
      return response_({
        ok: false,
        message: 'Admin access denied.',
      }, callback);
    }

    const productsSheet = getProductsSheet_();

    return response_({
      ok: true,
      version: APP_VERSION,
      products: readAllProducts_(productsSheet),
      orders: readOrders_(getOrdersSheet_(false)),
    }, callback);
  }

  getOrdersSheet_();
  getProductsSheet_();
  getAdminsSheet_();
  setupDashboard_();

  return response_({
    ok: true,
    version: APP_VERSION,
    message: 'StreetCart Google Sheets endpoint is ready.',
    productsUrl: ScriptApp.getService().getUrl() + '?action=products',
    spreadsheetUrl: spreadsheet.getUrl(),
    sheets: [DASHBOARD_SHEET_NAME, ORDERS_SHEET_NAME, PRODUCTS_SHEET_NAME, ADMINS_SHEET_NAME],
    orderHeaders: ORDER_HEADERS,
  }, callback);
}

function doPost(event) {
  try {
    const payload = parsePayload_(event);

    if (payload.action === 'updateProduct') {
      const admin = payload.admin || {};

      if (!validateAdmin_(admin.email, admin.password)) {
        return jsonResponse_({
          ok: false,
          message: 'Admin access denied.',
        });
      }

      updateProduct_(payload.product || {});
      return jsonResponse_({
        ok: true,
        message: 'Product updated.',
      });
    }

    if (payload.action === 'updateOrderStatus') {
      const admin = payload.admin || {};

      if (!validateAdmin_(admin.email, admin.password)) {
        return jsonResponse_({
          ok: false,
          message: 'Admin access denied.',
        });
      }

      updateOrderStatus_(payload.orderId, payload.status);
      return jsonResponse_({
        ok: true,
        message: 'Order status updated.',
      });
    }

    const sheet = getOrdersSheet_();
    const orderId = createOrderId_();
    const customer = payload.customer || {};
    const items = Array.isArray(payload.items) ? payload.items : [];
    const payment = payload.payment || {};
    const rawPaymentMethod = payload.paymentMethod || payment.method || 'Not selected';
    const paymentMethod = shortPaymentMethod_(rawPaymentMethod);
    const paymentStatus = normalizeOrderStatus_(payload.paymentStatus || payment.status || 'Pending');
    const itemSummary = items
      .map(function (item) {
        return [
          item.name || 'Product',
          item.size ? 'Size: ' + item.size : '',
          'Qty: ' + (item.qty || 1),
          'Rs ' + Number(item.price || 0) * Number(item.qty || 1),
        ]
          .filter(Boolean)
          .join(' | ');
      })
      .join('\n');

    appendOrder_(sheet, {
      'Order ID': orderId,
      'Created At': payload.createdAt || new Date().toISOString(),
      'Customer Name': customer.name || '',
      Phone: customer.phone || '',
      Address: customer.address || '',
      Items: itemSummary,
      Subtotal: Number(payload.subtotal || 0),
      'Delivery Fee': Number(payload.deliveryFee || 0),
      Total: Number(payload.total || 0),
      'Payment Method': paymentMethod,
      'Payment Status': paymentStatus,
      Notes: '',
      'UPI ID': paymentMethod === 'UPI' ? payment.upiId || '' : '',
      'UPI Reference': payment.reference || '',
      'Admin Verification': paymentMethod === 'COD' ? 'Confirm availability on WhatsApp' : 'Wait for WhatsApp screenshot',
      'Fulfillment Status': paymentStatus,
      'Script Version': APP_VERSION,
    });

    reduceStock_(items);
    setupDashboard_();

    return jsonResponse_({
      ok: true,
      orderId: orderId,
      message: 'Order saved.',
    });
  } catch (error) {
    return jsonResponse_({
      ok: false,
      message: error && error.message ? error.message : 'Could not save order.',
    });
  }
}

function getOrdersSheet_(shouldFormat) {
  const sheet = setupSheet_(ORDERS_SHEET_NAME, ORDER_HEADERS, []);

  if (shouldFormat !== false) {
    formatOrdersSheet_(sheet);
  }

  return sheet;
}

function getProductsSheet_() {
  return setupSheet_(PRODUCTS_SHEET_NAME, PRODUCT_HEADERS, SAMPLE_PRODUCTS);
}

function getAdminsSheet_() {
  return setupSheet_(ADMINS_SHEET_NAME, ADMIN_HEADERS, SAMPLE_ADMINS);
}

function validateAdmin_(email, password) {
  const sheet = getAdminsSheet_();
  const values = sheet.getDataRange().getValues();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedPassword = String(password || '');

  return values.slice(1).some(function (row) {
    const rowEmail = String(row[0] || '').trim().toLowerCase();
    const rowPassword = String(row[1] || '');
    const isActive = row[3] === true || String(row[3]).toUpperCase() === 'TRUE';

    return isActive && rowEmail === normalizedEmail && rowPassword === normalizedPassword;
  });
}

function appendOrder_(sheet, order) {
  ensureHeaders_(sheet, ORDER_HEADERS);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(function (header) {
    return Object.prototype.hasOwnProperty.call(order, header) ? order[header] : '';
  });

  sheet.appendRow(row);
}

function setupDashboard_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet =
    spreadsheet.getSheetByName(DASHBOARD_SHEET_NAME) || spreadsheet.insertSheet(DASHBOARD_SHEET_NAME, 0);
  const ordersSheet = getOrdersSheet_();
  const paymentMethodColumn = columnLetter_(ordersSheet, 'Payment Method');
  const adminVerificationColumn = columnLetter_(ordersSheet, 'Admin Verification');
  const totalColumn = columnLetter_(ordersSheet, 'Total');

  sheet.clear();
  sheet.getRange('A1').setValue('StreetCart Admin Dashboard');
  sheet.getRange('A1').setFontSize(18).setFontWeight('bold');
  sheet.getRange('A2').setValue('Script version: ' + APP_VERSION);

  const rows = [
    ['Metric', 'Value', 'What it means'],
    ['Total orders', '=MAX(COUNTA(Orders!A:A)-1,0)', 'All orders saved from website'],
    ['UPI orders', '=COUNTIF(Orders!' + paymentMethodColumn + ':' + paymentMethodColumn + ',"UPI")', 'Customer selected UPI'],
    [
      'COD orders',
      '=COUNTIF(Orders!' + paymentMethodColumn + ':' + paymentMethodColumn + ',"COD")+COUNTIF(Orders!' + paymentMethodColumn + ':' + paymentMethodColumn + ',"Cash on delivery")',
      'Customer selected cash on delivery',
    ],
    [
      'UPI screenshots pending',
      '=COUNTIFS(Orders!' +
        paymentMethodColumn +
        ':' +
        paymentMethodColumn +
        ',"UPI",Orders!' +
        adminVerificationColumn +
        ':' +
        adminVerificationColumn +
        ',"Wait for WhatsApp screenshot")',
      'Customer should send payment screenshot on WhatsApp',
    ],
    [
      'COD needs owner confirmation',
      '=COUNTIFS(Orders!' +
        paymentMethodColumn +
        ':' +
        paymentMethodColumn +
        ',"COD",Orders!' +
        adminVerificationColumn +
        ':' +
        adminVerificationColumn +
        ',"Confirm availability on WhatsApp")',
      'Confirm stock/availability with customer on WhatsApp',
    ],
    ['Total sales value', '=SUM(Orders!' + totalColumn + ':' + totalColumn + ')', 'Total order value in rupees'],
  ];

  sheet.getRange(3, 1, rows.length, rows[0].length).setValues(rows);
  sheet.getRange('A3:C3').setFontWeight('bold').setBackground('#17211d').setFontColor('#ffffff');
  sheet.getRange('A4:C9').setBackground('#f7f5ef');
  sheet.getRange('A11').setValue('Admin workflow');
  sheet.getRange('A11').setFontWeight('bold');
  sheet
    .getRange('A12')
    .setValue(
      '1. Open Orders tab. 2. For UPI, wait for the WhatsApp payment screenshot, then verify amount in UPI/bank app. 3. For COD, confirm availability on WhatsApp. 4. Update Admin Verification and Fulfillment Status.',
    );
  sheet.getRange('A12:C12').merge().setWrap(true);
  sheet.setFrozenRows(3);
  sheet.autoResizeColumns(1, 3);
}

function columnLetter_(sheet, header) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const columnIndex = headers.indexOf(header) + 1;

  if (!columnIndex) {
    throw new Error('Missing header: ' + header);
  }

  let letter = '';
  let index = columnIndex;

  while (index > 0) {
    const remainder = (index - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    index = Math.floor((index - 1) / 26);
  }

  return letter;
}

function setupSheet_(sheetName, headers, sampleRows) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);

    if (sampleRows.length) {
      sheet.getRange(2, 1, sampleRows.length, headers.length).setValues(sampleRows);
    }

    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.autoResizeColumns(1, headers.length);
  } else {
    ensureHeaders_(sheet, headers);
  }

  return sheet;
}

function ensureHeaders_(sheet, headers) {
  const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  headers.forEach(function (header) {
    if (existingHeaders.indexOf(header) === -1) {
      const nextColumn = sheet.getLastColumn() + 1;
      sheet.getRange(1, nextColumn).setValue(header);
      sheet.getRange(1, nextColumn).setFontWeight('bold');
    }
  });
}

function formatOrdersSheet_(sheet) {
  const lastColumn = sheet.getLastColumn();

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, lastColumn).setFontWeight('bold').setBackground('#17211d').setFontColor('#ffffff');
  sheet.autoResizeColumns(1, lastColumn);
  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidth(3, 170);
  sheet.setColumnWidth(4, 120);
  sheet.setColumnWidth(5, 260);
  sheet.setColumnWidth(6, 320);
  sheet.setColumnWidth(13, 140);
  sheet.setColumnWidth(14, 150);
  sheet.setColumnWidth(15, 190);
  sheet.setColumnWidth(16, 150);

  if (!sheet.getFilter()) {
    sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 1), lastColumn).createFilter();
  }
}

function readProducts_(sheet) {
  return readAllProducts_(sheet).filter(function (product) {
    return product.id && product.name && product.price > 0 && product.active && product.stock > 0;
  });
}

function readAllProducts_(sheet) {
  const values = sheet.getDataRange().getValues();
  const rows = values.slice(1);

  return rows
    .map(function (row) {
      return {
        id: Number(row[0]),
        name: String(row[1] || ''),
        category: String(row[2] || 'Accessories'),
        price: Number(row[3] || 0),
        image: String(row[4] || ''),
        sizes: String(row[5] || 'Free')
          .split(',')
          .map(function (size) {
            return size.trim();
          })
          .filter(Boolean),
        stock: Number(row[6] || 0),
        active: row[7] === true || String(row[7]).toUpperCase() === 'TRUE',
      };
    })
    .filter(function (product) {
      return product.id && product.name;
    });
}

function readOrders_(sheet) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0] || [];

  return values
    .slice(1)
    .filter(function (row) {
      return row[0];
    })
    .map(function (row) {
      return {
        orderId: valueByHeader_(headers, row, 'Order ID'),
        createdAt: valueByHeader_(headers, row, 'Created At'),
        customerName: valueByHeader_(headers, row, 'Customer Name'),
        phone: valueByHeader_(headers, row, 'Phone'),
        address: valueByHeader_(headers, row, 'Address'),
        items: valueByHeader_(headers, row, 'Items'),
        total: Number(valueByHeader_(headers, row, 'Total') || 0),
        paymentMethod: valueByHeader_(headers, row, 'Payment Method'),
        paymentStatus: valueByHeader_(headers, row, 'Payment Status'),
        adminVerification: valueByHeader_(headers, row, 'Admin Verification'),
        fulfillmentStatus: valueByHeader_(headers, row, 'Fulfillment Status'),
      };
    })
    .reverse();
}

function valueByHeader_(headers, row, header) {
  const index = headers.indexOf(header);
  return index === -1 ? '' : row[index];
}

function updateProduct_(product) {
  const sheet = getProductsSheet_();
  const values = sheet.getDataRange().getValues();
  const id = Number(product.id);

  for (let index = 1; index < values.length; index++) {
    if (Number(values[index][0]) === id) {
      sheet.getRange(index + 1, 2, 1, 7).setValues([
        [
          product.name || '',
          product.category || 'Accessories',
          Number(product.price || 0),
          product.image || '',
          product.sizes || 'Free',
          Number(product.stock || 0),
          product.active === true || String(product.active).toUpperCase() === 'TRUE',
        ],
      ]);
      return;
    }
  }

  sheet.appendRow([
    id || createProductId_(values),
    product.name || '',
    product.category || 'Accessories',
    Number(product.price || 0),
    product.image || '',
    product.sizes || 'Free',
    Number(product.stock || 0),
    product.active === true || String(product.active).toUpperCase() === 'TRUE',
  ]);
}

function updateOrderStatus_(orderId, status) {
  const sheet = getOrdersSheet_(false);
  const values = sheet.getDataRange().getValues();
  const headers = values[0] || [];
  const orderIdColumn = headers.indexOf('Order ID') + 1;
  const paymentStatusColumn = headers.indexOf('Payment Status') + 1;
  const fulfillmentStatusColumn = headers.indexOf('Fulfillment Status') + 1;
  const adminVerificationColumn = headers.indexOf('Admin Verification') + 1;
  const nextStatus = normalizeOrderStatus_(status);

  if (!orderIdColumn || !paymentStatusColumn) {
    throw new Error('Orders sheet is missing required columns.');
  }

  for (let index = 1; index < values.length; index++) {
    if (String(values[index][orderIdColumn - 1]) === String(orderId)) {
      const rowNumber = index + 1;
      sheet.getRange(rowNumber, paymentStatusColumn).setValue(nextStatus);

      if (fulfillmentStatusColumn) {
        sheet.getRange(rowNumber, fulfillmentStatusColumn).setValue(nextStatus);
      }

      if (adminVerificationColumn) {
        sheet
          .getRange(rowNumber, adminVerificationColumn)
          .setValue(nextStatus === 'Confirmed' ? 'Confirmed by admin' : 'Pending admin confirmation');
      }

      return;
    }
  }

  throw new Error('Order not found.');
}

function shortPaymentMethod_(paymentMethod) {
  return String(paymentMethod || '').toLowerCase() === 'cash on delivery' ? 'COD' : paymentMethod || 'Not selected';
}

function normalizeOrderStatus_(status) {
  return String(status || '').toLowerCase().indexOf('confirmed') !== -1 ? 'Confirmed' : 'Pending';
}

function createProductId_(values) {
  const ids = values.slice(1).map(function (row) {
    return Number(row[0] || 0);
  });

  return Math.max.apply(null, ids.concat([0])) + 1;
}

function reduceStock_(items) {
  const sheet = getProductsSheet_();
  const values = sheet.getDataRange().getValues();
  const stockById = {};

  items.forEach(function (item) {
    const id = String(item.id);
    stockById[id] = (stockById[id] || 0) + Number(item.qty || 1);
  });

  values.slice(1).forEach(function (row, index) {
    const id = String(row[0]);
    const orderedQty = stockById[id];

    if (!orderedQty) {
      return;
    }

    const currentStock = Number(row[6] || 0);
    const nextStock = Math.max(0, currentStock - orderedQty);
    sheet.getRange(index + 2, 7).setValue(nextStock);
  });
}

function parsePayload_(event) {
  if (!event || !event.postData || !event.postData.contents) {
    throw new Error('Missing POST body.');
  }

  return JSON.parse(event.postData.contents);
}

function createOrderId_() {
  return 'ORD-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
}

function jsonResponse_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function response_(data, callback) {
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + JSON.stringify(data) + ');').setMimeType(
      ContentService.MimeType.JAVASCRIPT,
    );
  }

  return jsonResponse_(data);
}
