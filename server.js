// ==========================================
// 【重要】動かし方
// 1. このファイルを「server.js」という名前で保存します。
// 2. 同じフォルダに「costume3.png」を置きます。
// 3. コマンドプロンプトやターミナルで以下を実行します：
//    npm install express socket.io
//    node server.js
// 4. ブラウザで「http://localhost:3000」を開くと1P、別のタブや別のPCで開くと2Pとしてオンライン対戦が始まります！
// ==========================================

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// 静的ファイルの配信設定
app.use(express.static(__dirname));

// ルートアクセスでHTMLを返す
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let players = {}; // 接続されているプレイヤーたち

io.on('connection', (socket) => {
    console.log('プレイヤーが接続しました: ' + socket.id);

    // 満員（2人まで）のチェック
    if (Object.keys(players).length >= 2) {
        socket.emit('room_full');
        socket.disconnect();
        return;
    }

    // 新しいプレイヤーの初期化（1人目は左、2人目は右）
    const isP1 = Object.keys(players).length === 0;
    players[socket.id] = {
        id: socket.id,
        x: isP1 ? 150 : 850,
        y: 300,
        angle: isP1 ? 0 : Math.PI,
        hp: 150,
        maxHp: 150,
        isPlayer1: isP1
    };

    // 本人に初期情報を送る
    socket.emit('init', { id: socket.id, playerList: players });
    // 他の人に新プレイヤーの加入を通知
    socket.broadcast.emit('new_player', players[socket.id]);

    // 移動やアングルの同期データを受信
    socket.on('player_move', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            players[socket.id].angle = data.angle;
            // 全員に最新の位置をブロードキャスト
            socket.broadcast.emit('player_updated', players[socket.id]);
        }
    });

    // 通常攻撃の同期
    socket.on('shoot', (bulletData) => {
        socket.broadcast.emit('enemy_shoot', bulletData);
    });

    // スキルの同期
    socket.on('use_skill', () => {
        socket.broadcast.emit('enemy_skill', { attackerId: socket.id });
    });

    // ダメージの同期
    socket.on('take_damage', (data) => {
        if (players[data.targetId]) {
            players[data.targetId].hp = data.hp;
            io.emit('hp_updated', data);
        }
    });

    // 切断時の処理
    socket.on('disconnect', () => {
        console.log('プレイヤーが切断しました: ' + socket.id);
        delete players[socket.id];
        io.emit('player_left', socket.id);
    });
});

http.listen(3000, () => {
    console.log('サーバーが起動しました！ URL: http://localhost:3000');
});
