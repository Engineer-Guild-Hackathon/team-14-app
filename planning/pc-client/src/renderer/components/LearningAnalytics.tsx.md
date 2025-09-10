# LearningAnalytics.tsx

## 役割
学習プロセスの可視化コンポーネント

## Props
```typescript
interface Props {
  studentId: string
  timeRange: 'week' | 'month' | 'all'
  viewType: 'individual' | 'class'
}
```

## 表示要素
- 学習時間の推移グラフ
- 実装成功率の変化
- つまずきポイントのヒートマップ
- 使用した記事と実装の関連図
- スキル習得レーダーチャート
- コード品質の向上曲線

## 主要な関数
- `renderTimelineChart()` - 学習タイムライン表示
- `renderSkillRadar()` - スキルレーダーチャート
- `renderBottleneckHeatmap()` - つまずき箇所分析
- `renderImplementationPath()` - 記事→実装の経路表示
- `exportAnalytics()` - 分析データエクスポート

## インタラクティブ機能
- 特定時期の詳細表示
- つまずき箇所クリックで詳細分析表示
- 学習パターンの比較表示

## ライブラリ
- Chart.js または D3.js for データ可視化
- React Query for データフェッチング