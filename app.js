const express = require('express');
const { body, validationResult } = require('express-validator');
const app = express();

// 📌 ミドルウェア系はできるだけ先に
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public')); // ← 安全のためにここに移動！
app.use(express.json());

// 📌 DB接続設定
require('dotenv').config();

const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});


//バリデーション
const expenseValidationRules = [
  body('account_category')
    .notEmpty().withMessage('account_category は必須です')
    .isIn(['販管費', '変動費']).withMessage('account_category の値が不正です'),

  body('payee')
    .notEmpty().withMessage('payee は必須です'),

  body('amount')
    .notEmpty().withMessage('amount は必須です')
    .isDecimal().withMessage('amount は数値で入力してください'),

  body('payment_month')
    .notEmpty().withMessage('payment_month は必須です')
    .matches(/^\d{4}-\d{2}$/).withMessage('payment_month は YYYY-MM 形式で入力してください'),

  body('payment_method')
    .notEmpty().withMessage('payment_method は必須です')
    .isIn(['振込', 'クレジットカード', '口座振替']).withMessage('payment_method の値が不正です')
];

// APIエンドポイント：POST /expenses
app.post('/expenses', expenseValidationRules, (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // バリデーションエラーがある場合はエラーメッセージを返す
    return res.status(400).json({ errors: errors.array() });
  }

  // バリデーションOK！ここでデータベースに登録したりする処理を書く
  res.status(200).json({ message: '登録成功！' });
});

app.post('/register', (req, res) => {
  console.log(req.body);
  connection.query(
    'INSERT INTO payments(account_category, payee, amount, payment_month, payment_method) VALUES(?,?,?,?,?)',
    [req.body.account_category, req.body.payee, req.body.amount, req.body.payment_month, req.body.payment_method],
    (error, results) => {
      if (error) {
        console.error('DBエラー:', error);
        return res.status(500).send('データベースエラー');
      }
      res.redirect('/table');
    }
  );
});


// 📌 ルーティング（順番は自由だけど分かりやすく！）
app.get('/', (req, res) => {
  connection.query(
    'SELECT SUM(amount) AS total_amount, account_category, payment_month FROM payments GROUP BY payment_month, account_category;',
    (error, results) => {
      console.log(results);
      res.render('pages/home', { payments: results });
    }
  );
});

app.get('/register', (req, res) => {
  res.render('pages/register');
});

app.get('/table', (req, res) => {
  connection.query('SELECT * FROM payments ORDER BY id DESC', (error, results) => {
    res.render('pages/table', { payments: results });
  });
});



//削除確認用ルーティング//
app.get('/delete-confirm/:id', (req, res) => {
  const id = req.params.id;

  connection.query('SELECT * FROM payments WHERE id = ?', [id], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).send('データが見つかりません');
    }

    const item = results[0];
    res.render('pages/delete-confirm', { item }); // ← ここで渡す！
  });
});


//削除用ルーティング//
app.post('/delete/:id', (req, res) => {
  console.log('削除ID:', req.params.id); // ← 最初にログ出そう！
  connection.query(
    'DELETE FROM payments WHERE id = ?',
    [req.params.id],
    (error, results) => {
      if (error) {
        console.error('削除エラー:', error);
        return res.status(500).send('削除に失敗しました');
      }
      res.redirect('/table');
    }
  );
});

//更新用ルーティング//
app.get('/edit/:id',(req,res) => {
    connection.query(
        'SELECT * FROM payments WHERE id = ?',
        [req.params.id],
        (error,results) => {
            if (results.length === 0) {
                return res.send('データが見つかりませんでした');
            }
            res.render('pages/edit.ejs',{editItem: results[0]});
        }
    )
})

app.post('/update/:id', (req, res) => {
  console.log("このプログラムは正常に動作しています")
  connection.query(
    'UPDATE payments SET account_category = ?, payee = ?, amount = ?, payment_month = ?, payment_method = ? WHERE id = ?',
    [req.body.account_category, req.body.payee, req.body.amount, req.body.payment_month, req.body.payment_method, req.params.id],
    (error, result) => {
      res.redirect('/table');
    }
  )
})


// 📌 最後に listen！
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});