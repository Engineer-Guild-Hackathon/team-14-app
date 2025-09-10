# analytics.service.ts

## 役割
学習分析・進捗可視化サービス

## 主要な関数
- `generateStudentProgressReport()` - 生徒の詳細進捗レポート
- `analyzeCodeEditingPattern()` - コード編集パターン分析
- `detectLearningBottleneck()` - 学習のつまずき箇所検出
- `generateClassroomInsights()` - クラス全体の学習傾向分析
- `trackArticleToImplementationPath()` - 記事→実装の学習経路追跡
- `calculateLearningEfficiency()` - 学習効率指標算出

## 分析データ
- 実装時間の推移
- エラーパターンの頻度
- ヒント使用回数
- コードの質的変化
- 記事理解度から実装成功率

## 可視化データ生成
- 学習曲線グラフ
- スキルレーダーチャート
- つまずきポイントヒートマップ

## 依存関係
- progress.model.ts から進捗データ取得
- code-history.model.ts からコード履歴分析