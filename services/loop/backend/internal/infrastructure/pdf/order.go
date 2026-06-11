package pdf

import (
	"bytes"
	_ "embed"
	"fmt"
	"time"

	"github.com/signintech/gopdf"
)

//go:embed fonts/NotoSansJP-Regular.ttf
var notoFontData []byte

type OrderPDFData struct {
	OrderNumber        string
	Date               time.Time
	DealerName         string
	SalonName          string
	StaffName          string
	IsNextMonthInvoice bool
	Items              []OrderPDFItem
}

type OrderPDFItem struct {
	Name          string
	JanCode       *string
	Quantity      uint32
	Unit          string
	EstimatedCost *uint32
}

// GenerateOrderPDF は発注書PDFをメモリ上に生成して返す。
func GenerateOrderPDF(data OrderPDFData) ([]byte, error) {
	pdf := gopdf.GoPdf{}
	pdf.Start(gopdf.Config{PageSize: *gopdf.PageSizeA4})
	pdf.AddPage()

	if err := pdf.AddTTFFontData("NotoSansJP", notoFontData); err != nil {
		return nil, fmt.Errorf("pdf font: %w", err)
	}

	w := 595.28 // A4 width in points

	// ─── ヘッダー ────────────────────────────────────────────────

	// ロゴ / サービス名
	_ = pdf.SetFont("NotoSansJP", "", 10)
	pdf.SetTextColor(120, 100, 70)
	pdf.SetX(40)
	pdf.SetY(40)
	_ = pdf.Cell(nil, "◎ CYGNUS LOOP")

	// タイトル「発 注 書」
	_ = pdf.SetFont("NotoSansJP", "", 18)
	pdf.SetTextColor(30, 25, 20)
	titleW := 120.0
	pdf.SetX(w - 40 - titleW)
	pdf.SetY(36)
	_ = pdf.Cell(&gopdf.Rect{W: titleW, H: 22}, "発  注  書")

	// No. と日付
	_ = pdf.SetFont("NotoSansJP", "", 9)
	pdf.SetTextColor(100, 90, 80)
	pdf.SetX(w - 40 - 160)
	pdf.SetY(62)
	_ = pdf.Cell(&gopdf.Rect{W: 160, H: 14}, fmt.Sprintf("No.  %s", data.OrderNumber))
	pdf.SetX(w - 40 - 160)
	pdf.SetY(76)
	_ = pdf.Cell(&gopdf.Rect{W: 160, H: 14}, fmt.Sprintf("%d年%d月%d日",
		data.Date.Year(), data.Date.Month(), data.Date.Day()))

	// 翌月伝票フラグ
	if data.IsNextMonthInvoice {
		_ = pdf.SetFont("NotoSansJP", "", 8)
		pdf.SetTextColor(200, 80, 60)
		pdf.SetX(w - 40 - 160)
		pdf.SetY(90)
		_ = pdf.Cell(&gopdf.Rect{W: 160, H: 12}, "※ 翌月伝票")
	}

	// 区切り線
	pdf.SetLineWidth(0.5)
	pdf.SetStrokeColor(180, 165, 140)
	pdf.Line(40, 105, w-40, 105)

	// ─── 発注先 / 発注元 ─────────────────────────────────────────

	y := 118.0

	// 発注先
	_ = pdf.SetFont("NotoSansJP", "", 8)
	pdf.SetTextColor(120, 100, 70)
	pdf.SetX(40)
	pdf.SetY(y)
	_ = pdf.Cell(nil, "【発注先】")
	_ = pdf.SetFont("NotoSansJP", "", 13)
	pdf.SetTextColor(30, 25, 20)
	pdf.SetX(40)
	pdf.SetY(y + 14)
	_ = pdf.Cell(nil, data.DealerName+"  御中")

	// 発注元
	_ = pdf.SetFont("NotoSansJP", "", 8)
	pdf.SetTextColor(120, 100, 70)
	pdf.SetX(w/2)
	pdf.SetY(y)
	_ = pdf.Cell(nil, "【発注元】")
	_ = pdf.SetFont("NotoSansJP", "", 11)
	pdf.SetTextColor(30, 25, 20)
	pdf.SetX(w / 2)
	pdf.SetY(y + 14)
	_ = pdf.Cell(nil, data.SalonName)
	if data.StaffName != "" {
		_ = pdf.SetFont("NotoSansJP", "", 9)
		pdf.SetTextColor(100, 90, 80)
		pdf.SetX(w / 2)
		pdf.SetY(y + 28)
		_ = pdf.Cell(nil, "担当："+data.StaffName)
	}

	// ─── 品目テーブル ────────────────────────────────────────────

	tableY := y + 55
	colX := [6]float64{40, 185, 310, 360, 430, 500}
	colW := [6]float64{145, 125, 50, 70, 70, 55}
	headers := [6]string{"品目名", "JANコード", "数量", "単位", "単価（円）", "金額（円）"}

	// ヘッダー背景
	pdf.SetFillColor(45, 38, 30)
	pdf.RectFromUpperLeftWithStyle(40, tableY, w-80, 20, "F")

	// ヘッダーテキスト
	_ = pdf.SetFont("NotoSansJP", "", 8)
	pdf.SetTextColor(220, 200, 165)
	for i, h := range headers {
		pdf.SetX(colX[i] + 4)
		pdf.SetY(tableY + 6)
		_ = pdf.Cell(&gopdf.Rect{W: colW[i] - 4, H: 14}, h)
	}

	// 行データ
	var totalCost uint32
	for idx, item := range data.Items {
		ry := tableY + 20 + float64(idx)*22
		if idx%2 == 0 {
			pdf.SetFillColor(245, 241, 234)
		} else {
			pdf.SetFillColor(255, 253, 249)
		}
		pdf.RectFromUpperLeftWithStyle(40, ry, w-80, 22, "F")

		_ = pdf.SetFont("NotoSansJP", "", 9)
		pdf.SetTextColor(30, 25, 20)
		pdf.SetX(colX[0] + 4)
		pdf.SetY(ry + 7)
		_ = pdf.Cell(&gopdf.Rect{W: colW[0] - 8, H: 14}, item.Name)

		janStr := "—"
		if item.JanCode != nil && *item.JanCode != "" {
			janStr = *item.JanCode
		}
		pdf.SetX(colX[1] + 4)
		pdf.SetY(ry + 7)
		_ = pdf.Cell(&gopdf.Rect{W: colW[1] - 8, H: 14}, janStr)

		qty := fmt.Sprintf("%d", item.Quantity)
		pdf.SetX(colX[2] + 4)
		pdf.SetY(ry + 7)
		_ = pdf.Cell(&gopdf.Rect{W: colW[2] - 8, H: 14}, qty)

		pdf.SetX(colX[3] + 4)
		pdf.SetY(ry + 7)
		_ = pdf.Cell(&gopdf.Rect{W: colW[3] - 8, H: 14}, item.Unit)

		var costStr, totalStr string
		if item.EstimatedCost != nil {
			costStr = fmt.Sprintf("%d", *item.EstimatedCost)
			t := *item.EstimatedCost * item.Quantity
			totalCost += t
			totalStr = fmt.Sprintf("%d", t)
		} else {
			costStr = "—"
			totalStr = "—"
		}
		pdf.SetX(colX[4] + 4)
		pdf.SetY(ry + 7)
		_ = pdf.Cell(&gopdf.Rect{W: colW[4] - 8, H: 14}, costStr)
		pdf.SetX(colX[5] + 4)
		pdf.SetY(ry + 7)
		_ = pdf.Cell(&gopdf.Rect{W: colW[5] - 8, H: 14}, totalStr)
	}

	// 合計行
	totalY := tableY + 20 + float64(len(data.Items))*22
	pdf.SetLineWidth(0.5)
	pdf.SetStrokeColor(180, 165, 140)
	pdf.Line(40, totalY, w-40, totalY)

	_ = pdf.SetFont("NotoSansJP", "", 9)
	pdf.SetTextColor(120, 100, 70)
	pdf.SetX(colX[4] + 4)
	pdf.SetY(totalY + 7)
	_ = pdf.Cell(nil, "合計")

	pdf.SetTextColor(30, 25, 20)
	pdf.SetX(colX[5] + 4)
	pdf.SetY(totalY + 7)
	if totalCost > 0 {
		_ = pdf.Cell(nil, fmt.Sprintf("%d 円", totalCost))
	} else {
		_ = pdf.Cell(nil, "—")
	}

	// ─── 備考 ────────────────────────────────────────────────────

	footerY := totalY + 35
	pdf.SetLineWidth(0.3)
	pdf.SetStrokeColor(200, 185, 160)
	pdf.Line(40, footerY, w-40, footerY)

	_ = pdf.SetFont("NotoSansJP", "", 8)
	pdf.SetTextColor(120, 100, 70)
	pdf.SetX(40)
	pdf.SetY(footerY + 10)
	_ = pdf.Cell(nil, "備考：本発注書受領後、在庫状況をご確認の上ご対応ください。")

	// ─── 出力 ────────────────────────────────────────────────────

	var buf bytes.Buffer
	if _, err := pdf.WriteTo(&buf); err != nil {
		return nil, fmt.Errorf("pdf write: %w", err)
	}
	return buf.Bytes(), nil
}
