package mailer

import (
	"context"
	"fmt"
)

// LogMailer は開発用。実際にはメールを送らずログに出力する。
// 本番では SendGrid 等の実装に差し替える。
type LogMailer struct{}

func NewLogMailer() *LogMailer { return &LogMailer{} }

func (m *LogMailer) SendInvitation(ctx context.Context, to, salonName, inviteURL string) error {
	fmt.Printf("[MAILER] 招待メール送信先: %s / サロン: %s / URL: %s\n", to, salonName, inviteURL)
	return nil
}

func (m *LogMailer) SendPasswordReset(ctx context.Context, to, resetURL string) error {
	fmt.Printf("[MAILER] パスワードリセットメール送信先: %s / URL: %s\n", to, resetURL)
	return nil
}
