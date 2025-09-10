graph TD
subgraph ベースキャンプ PC クライアントアプリ
A[アプリ起動] --> B{ログイン状態？}
B -- NO --> C[ログイン/新規登録]
B -- YES --> D[ダッシュボード]
C --> D
D --> E[プロジェクト一覧/登録]
E -- 登録 --> F[ローカルディレクトリ指定]
F --> G[プロジェクト解析＆ファイル監視開始]
G --> D

    subgraph "ファイル検証プロセス"
        direction LR
         G -- 変更検知 --> G_verify[コードを検証]
         G_verify --> G_check{解答と一致？}
    end

end

subgraph ナビゲーター Chrome 拡張
J[技術記事をブラウジング] --> K[拡張機能アイコンをクリック]
K --> L{プロジェクト選択済み？}
L -- NO --> M[プロジェクト選択ポップアップ]
L -- YES --> N[実装したいこと入力フォーム]
M --> N
N -- 送信 --> O[クエスト生成中...]

    %% 新しいクエストフロー
    O --> P_arrange[Step1: コードブロック並べ替えで理解]
    P_arrange -- クリア --> P_write[Step2: 指示に従いエディタで実装]
    P_write --> P_wait[PCクライアントの検証を待機...]

    subgraph "検証結果"
         direction LR
         P_wait -- 成功 --> R[次のステップへ]
         P_wait -- 失敗 --> S[ヒント表示/再挑戦]
    end

    S --> P_write
    R -- ... --> T[最終クエスト]
    T -- クリア --> U[登頂成功！ 実装完了]
    U --> V[登頂記録に追加ボタン]
    V -- クリック --> W[ベースキャンプへ記録を送信]

end

subgraph 連携
G_check -- はい --> P_wait
G_check -- いいえ --> P_wait
end
