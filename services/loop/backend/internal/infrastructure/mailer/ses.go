package mailer

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"mime/multipart"
	"mime/quotedprintable"
	"net/textproto"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sesv2"
	sestypes "github.com/aws/aws-sdk-go-v2/service/sesv2/types"
)

// SESMailer はAWS SESを使ってメールを送信する。
type SESMailer struct {
	client *sesv2.Client
	from   string
}

func NewSESMailer(region, from string) (*SESMailer, error) {
	cfg, err := config.LoadDefaultConfig(context.Background(), config.WithRegion(region))
	if err != nil {
		return nil, fmt.Errorf("SESMailer config: %w", err)
	}
	return &SESMailer{
		client: sesv2.NewFromConfig(cfg),
		from:   from,
	}, nil
}

// SendInvitation — スタッフ招待メール
func (m *SESMailer) SendInvitation(ctx context.Context, to, salonName, inviteURL string) error {
	subject := fmt.Sprintf("【%s】Cygnus LOOP スタッフ招待のご案内", salonName)
	body := fmt.Sprintf(`%s から Cygnus LOOP のスタッフとして招待されました。

以下のURLを開いて登録を完了してください：

%s

（このリンクの有効期限は72時間です）

――
Cygnus LOOP
`, salonName, inviteURL)
	return m.sendSimpleText(ctx, to, subject, body)
}

// SendPasswordReset — パスワードリセットメール
func (m *SESMailer) SendPasswordReset(ctx context.Context, to, resetURL string) error {
	subject := "【Cygnus LOOP】パスワードリセットのご案内"
	body := fmt.Sprintf(`パスワードリセットのリクエストを受け付けました。

以下のURLを開いてパスワードを再設定してください：

%s

（このリンクの有効期限は1時間です）
心当たりがない場合は、このメールを破棄してください。

――
Cygnus LOOP
`, resetURL)
	return m.sendSimpleText(ctx, to, subject, body)
}

func (m *SESMailer) sendSimpleText(ctx context.Context, to, subject, body string) error {
	_, err := m.client.SendEmail(ctx, &sesv2.SendEmailInput{
		FromEmailAddress:     aws.String(m.from),
		ConfigurationSetName: aws.String("cygnus-main"),
		Destination: &sestypes.Destination{
			ToAddresses: []string{to},
		},
		Content: &sestypes.EmailContent{
			Simple: &sestypes.Message{
				Subject: &sestypes.Content{
					Data:    aws.String(subject),
					Charset: aws.String("UTF-8"),
				},
				Body: &sestypes.Body{
					Text: &sestypes.Content{
						Data:    aws.String(body),
						Charset: aws.String("UTF-8"),
					},
				},
			},
		},
	})
	return err
}

// SendOrderEmail はPDF添付メールを発注先に送信する。
func (m *SESMailer) SendOrderEmail(ctx context.Context, to, subject, bodyText string, pdfBytes []byte, fileName string) error {
	raw, err := buildMIMEMessage(m.from, to, subject, bodyText, pdfBytes, fileName)
	if err != nil {
		return fmt.Errorf("SESMailer build: %w", err)
	}

	_, err = m.client.SendEmail(ctx, &sesv2.SendEmailInput{
		FromEmailAddress:     aws.String(m.from),
		ConfigurationSetName: aws.String("cygnus-main"),
		Destination: &sestypes.Destination{
			ToAddresses: []string{to},
		},
		Content: &sestypes.EmailContent{
			Raw: &sestypes.RawMessage{Data: raw},
		},
	})
	return err
}

func buildMIMEMessage(from, to, subject, bodyText string, pdfBytes []byte, fileName string) ([]byte, error) {
	var buf bytes.Buffer
	buf.WriteString("From: " + from + "\r\n")
	buf.WriteString("To: " + to + "\r\n")
	buf.WriteString("Subject: =?UTF-8?B?" + base64.StdEncoding.EncodeToString([]byte(subject)) + "?=\r\n")
	buf.WriteString("MIME-Version: 1.0\r\n")

	mw := multipart.NewWriter(&buf)
	buf.WriteString("Content-Type: multipart/mixed; boundary=" + mw.Boundary() + "\r\n\r\n")

	// テキストパート
	th := make(textproto.MIMEHeader)
	th.Set("Content-Type", "text/plain; charset=UTF-8")
	th.Set("Content-Transfer-Encoding", "quoted-printable")
	textPart, err := mw.CreatePart(th)
	if err != nil {
		return nil, err
	}
	qw := quotedprintable.NewWriter(textPart)
	_, _ = qw.Write([]byte(bodyText))
	_ = qw.Close()

	// PDFパート
	ph := make(textproto.MIMEHeader)
	ph.Set("Content-Type", "application/pdf; name=\""+fileName+"\"")
	ph.Set("Content-Transfer-Encoding", "base64")
	ph.Set("Content-Disposition", "attachment; filename=\""+fileName+"\"")
	pdfPart, err := mw.CreatePart(ph)
	if err != nil {
		return nil, err
	}
	enc := base64.NewEncoder(base64.StdEncoding, pdfPart)
	_, _ = enc.Write(pdfBytes)
	_ = enc.Close()

	_ = mw.Close()

	// multipart/mixedのContent-Type行をヘッダーの後に移動
	raw := buf.String()
	raw = strings.Replace(raw, "MIME-Version: 1.0\r\nContent-Type:", "MIME-Version: 1.0\r\nContent-Type:", 1)
	return []byte(raw), nil
}
