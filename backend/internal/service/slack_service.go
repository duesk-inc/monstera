package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/duesk/monstera/internal/config"
	"github.com/duesk/monstera/internal/model"
	"go.uber.org/zap"
)

// SlackService Slack通知サービスのインターフェース
type SlackService interface {
	// SendMessage シンプルなメッセージ送信
	SendMessage(ctx context.Context, channel string, message string) error

	// SendRichMessage リッチメッセージ（Block Kit）送信
	SendRichMessage(ctx context.Context, channel string, blocks []SlackBlock) error

	// SendDirectMessage ダイレクトメッセージ送信
	SendDirectMessage(ctx context.Context, userID string, message string) error

	// 週報関連通知
	SendWeeklyReportReminder(ctx context.Context, userID string, userName string, weekStart, weekEnd string) error
	SendBulkReminderSummary(ctx context.Context, channel string, successCount, failureCount int) error

	// アラート関連通知
	SendAlertNotification(ctx context.Context, channel string, alertType, severity, userName, message string) error
	SendAlertSummary(ctx context.Context, channel string, alertCount int, criticalCount int) error

	// テスト送信
	TestConnection(ctx context.Context) error

	// 経費申請関連通知
	SendExpenseSubmittedNotice(ctx context.Context, userID string, expense *model.Expense, approverName string) error
	SendExpenseApprovedNotice(ctx context.Context, userID string, expense *model.Expense, approverName string, isFullyApproved bool) error
	SendExpenseRejectedNotice(ctx context.Context, userID string, expense *model.Expense, rejectorName string, reason string) error
	SendExpenseLimitWarning(ctx context.Context, userID string, limitType string, usageRate float64, currentAmount, limitAmount int) error
}

// SlackBlock Slack Block Kit用の構造体
type SlackBlock struct {
	Type     string              `json:"type"`
	Text     *SlackText          `json:"text,omitempty"`
	Elements []SlackBlockElement `json:"elements,omitempty"`
	Fields   []SlackField        `json:"fields,omitempty"`
}

// SlackText Slackテキスト構造体
type SlackText struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

// SlackBlockElement Slack Block要素
type SlackBlockElement struct {
	Type     string     `json:"type"`
	Text     *SlackText `json:"text,omitempty"`
	Value    string     `json:"value,omitempty"`
	URL      string     `json:"url,omitempty"`
	ActionID string     `json:"action_id,omitempty"`
	Style    string     `json:"style,omitempty"`
}

// SlackField Slackフィールド
type SlackField struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

// SlackMessage Slackメッセージ構造体
type SlackMessage struct {
	Channel     string            `json:"channel,omitempty"`
	Text        string            `json:"text"`
	Blocks      []SlackBlock      `json:"blocks,omitempty"`
	Attachments []SlackAttachment `json:"attachments,omitempty"`
}

// SlackAttachment Slack添付構造体
type SlackAttachment struct {
	Color      string                 `json:"color,omitempty"`
	Title      string                 `json:"title,omitempty"`
	Text       string                 `json:"text,omitempty"`
	Fields     []SlackAttachmentField `json:"fields,omitempty"`
	Footer     string                 `json:"footer,omitempty"`
	FooterIcon string                 `json:"footer_icon,omitempty"`
	Timestamp  int64                  `json:"ts,omitempty"`
}

// SlackAttachmentField Slack添付フィールド
type SlackAttachmentField struct {
	Title string `json:"title"`
	Value string `json:"value"`
	Short bool   `json:"short"`
}

// slackService Slack通知サービスの実装
type slackService struct {
	config *config.SlackConfig
	logger *zap.Logger
	client *http.Client
}

// NewSlackService Slack通知サービスのインスタンスを生成
func NewSlackService(cfg *config.SlackConfig, logger *zap.Logger) SlackService {
	return &slackService{
		config: cfg,
		logger: logger,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// SendMessage シンプルなメッセージ送信
func (s *slackService) SendMessage(ctx context.Context, channel string, message string) error {
	if !s.config.Enabled {
		s.logger.Info("Slack service is disabled, skipping message send",
			zap.String("channel", channel),
			zap.String("message", message))
		return nil
	}

	msg := SlackMessage{
		Channel: channel,
		Text:    message,
	}

	return s.sendToSlack(ctx, msg)
}

// SendRichMessage リッチメッセージ送信
func (s *slackService) SendRichMessage(ctx context.Context, channel string, blocks []SlackBlock) error {
	if !s.config.Enabled {
		s.logger.Info("Slack service is disabled, skipping rich message send",
			zap.String("channel", channel))
		return nil
	}

	msg := SlackMessage{
		Channel: channel,
		Text:    "Notification", // フォールバックテキスト
		Blocks:  blocks,
	}

	return s.sendToSlack(ctx, msg)
}

// SendDirectMessage ダイレクトメッセージ送信
func (s *slackService) SendDirectMessage(ctx context.Context, userID string, message string) error {
	// Slack APIでは、ユーザーIDを使用してDMチャンネルを開く必要がある
	// ここでは簡略化のため、@ユーザーID形式で送信
	return s.SendMessage(ctx, fmt.Sprintf("@%s", userID), message)
}

// SendWeeklyReportReminder 週報リマインダーを送信
func (s *slackService) SendWeeklyReportReminder(ctx context.Context, userID string, userName string, weekStart, weekEnd string) error {
	blocks := []SlackBlock{
		{
			Type: "header",
			Text: &SlackText{
				Type: "plain_text",
				Text: "📝 週報提出のリマインド",
			},
		},
		{
			Type: "section",
			Text: &SlackText{
				Type: "mrkdwn",
				Text: fmt.Sprintf("*%s* さん\n\n週報の提出期限が近づいています。", userName),
			},
		},
		{
			Type: "section",
			Fields: []SlackField{
				{
					Type: "mrkdwn",
					Text: fmt.Sprintf("*対象期間:*\n%s 〜 %s", weekStart, weekEnd),
				},
			},
		},
		{
			Type: "actions",
			Elements: []SlackBlockElement{
				{
					Type: "button",
					Text: &SlackText{
						Type: "plain_text",
						Text: "週報を提出する",
					},
					Value:    "submit_weekly_report",
					URL:      fmt.Sprintf("%s/weekly-report", s.config.SystemURL),
					ActionID: "submit_weekly_report",
					Style:    "primary",
				},
			},
		},
		{
			Type: "context",
			Elements: []SlackBlockElement{
				{
					Type: "mrkdwn",
					Text: &SlackText{
						Type: "mrkdwn",
						Text: "このメッセージは自動送信されています",
					},
				},
			},
		},
	}

	return s.SendRichMessage(ctx, fmt.Sprintf("@%s", userID), blocks)
}

// SendBulkReminderSummary 一括リマインダー送信結果サマリー
func (s *slackService) SendBulkReminderSummary(ctx context.Context, channel string, successCount, failureCount int) error {
	totalCount := successCount + failureCount

	color := "good" // 緑
	if failureCount > 0 {
		if failureCount > successCount {
			color = "danger" // 赤
		} else {
			color = "warning" // 黄
		}
	}

	attachment := SlackAttachment{
		Color: color,
		Title: "週報リマインダー一括送信完了",
		Fields: []SlackAttachmentField{
			{
				Title: "対象者数",
				Value: fmt.Sprintf("%d 名", totalCount),
				Short: true,
			},
			{
				Title: "送信成功",
				Value: fmt.Sprintf("%d 名", successCount),
				Short: true,
			},
		},
		Footer:     "Monstera Notification System",
		FooterIcon: s.config.IconURL,
		Timestamp:  time.Now().Unix(),
	}

	if failureCount > 0 {
		attachment.Fields = append(attachment.Fields, SlackAttachmentField{
			Title: "送信失敗",
			Value: fmt.Sprintf("%d 名", failureCount),
			Short: true,
		})
		attachment.Text = "一部の送信に失敗しました。ログを確認してください。"
	}

	msg := SlackMessage{
		Channel:     channel,
		Text:        "週報リマインダー一括送信が完了しました",
		Attachments: []SlackAttachment{attachment},
	}

	return s.sendToSlack(ctx, msg)
}

// SendAlertNotification アラート通知を送信
func (s *slackService) SendAlertNotification(ctx context.Context, channel string, alertType, severity, userName, message string) error {
	// 重要度に応じた色とアイコンを設定
	var color, icon string
	switch severity {
	case "high":
		color = "danger"
		icon = "🚨"
	case "medium":
		color = "warning"
		icon = "⚠️"
	case "low":
		color = "good"
		icon = "ℹ️"
	default:
		color = "#808080"
		icon = "📌"
	}

	attachment := SlackAttachment{
		Color: color,
		Title: fmt.Sprintf("%s %s", icon, alertType),
		Text:  message,
		Fields: []SlackAttachmentField{
			{
				Title: "対象者",
				Value: userName,
				Short: true,
			},
			{
				Title: "重要度",
				Value: severity,
				Short: true,
			},
		},
		Footer:     "Monstera Alert System",
		FooterIcon: s.config.IconURL,
		Timestamp:  time.Now().Unix(),
	}

	msg := SlackMessage{
		Channel:     channel,
		Text:        fmt.Sprintf("アラートが検知されました: %s", alertType),
		Attachments: []SlackAttachment{attachment},
	}

	return s.sendToSlack(ctx, msg)
}

// SendAlertSummary アラートサマリーを送信
func (s *slackService) SendAlertSummary(ctx context.Context, channel string, alertCount int, criticalCount int) error {
	blocks := []SlackBlock{
		{
			Type: "header",
			Text: &SlackText{
				Type: "plain_text",
				Text: "📊 アラート検知サマリー",
			},
		},
		{
			Type: "section",
			Text: &SlackText{
				Type: "mrkdwn",
				Text: fmt.Sprintf("本日のアラート検知結果をお知らせします。\n\n*総アラート数:* %d 件", alertCount),
			},
		},
	}

	if criticalCount > 0 {
		blocks = append(blocks, SlackBlock{
			Type: "section",
			Text: &SlackText{
				Type: "mrkdwn",
				Text: fmt.Sprintf("⚠️ *重要度「高」のアラート:* %d 件\n早急な対応が必要です。", criticalCount),
			},
		})
	}

	blocks = append(blocks, SlackBlock{
		Type: "actions",
		Elements: []SlackBlockElement{
			{
				Type: "button",
				Text: &SlackText{
					Type: "plain_text",
					Text: "詳細を確認",
				},
				Value:    "view_alerts",
				URL:      fmt.Sprintf("%s/admin/alerts", s.config.SystemURL),
				ActionID: "view_alerts",
				Style:    "primary",
			},
		},
	})

	return s.SendRichMessage(ctx, channel, blocks)
}

// TestConnection 接続テスト
func (s *slackService) TestConnection(ctx context.Context) error {
	if !s.config.Enabled {
		return fmt.Errorf("Slackサービスが無効になっています")
	}

	testMsg := SlackMessage{
		Channel: s.config.DefaultChannel,
		Text:    "🔔 Monstera Slack通知のテストメッセージです",
	}

	return s.sendToSlack(ctx, testMsg)
}

// sendToSlack Slackへメッセージを送信
func (s *slackService) sendToSlack(ctx context.Context, msg SlackMessage) error {
	// デフォルトチャンネルを設定
	if msg.Channel == "" {
		msg.Channel = s.config.DefaultChannel
	}

	// JSONにエンコード
	payload, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("メッセージのエンコードに失敗しました: %w", err)
	}

	// HTTPリクエスト作成
	req, err := http.NewRequestWithContext(ctx, "POST", s.config.WebhookURL, bytes.NewBuffer(payload))
	if err != nil {
		return fmt.Errorf("リクエストの作成に失敗しました: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	// リクエスト送信
	resp, err := s.client.Do(req)
	if err != nil {
		s.logger.Error("Failed to send Slack message",
			zap.String("channel", msg.Channel),
			zap.Error(err))
		return fmt.Errorf("Slackへの送信に失敗しました: %w", err)
	}
	defer resp.Body.Close()

	// レスポンス確認
	if resp.StatusCode != http.StatusOK {
		s.logger.Error("Slack API returned error",
			zap.Int("status", resp.StatusCode),
			zap.String("channel", msg.Channel))
		return fmt.Errorf("Slack APIエラー: status=%d", resp.StatusCode)
	}

	s.logger.Info("Slack message sent successfully",
		zap.String("channel", msg.Channel))

	return nil
}

// SendExpenseSubmittedNotice 経費申請提出通知を送信（承認者向け）
func (s *slackService) SendExpenseSubmittedNotice(ctx context.Context, userID string, expense *model.Expense, approverName string) error {
	blocks := []SlackBlock{
		{
			Type: "header",
			Text: &SlackText{
				Type: "plain_text",
				Text: "💰 経費申請承認依頼",
			},
		},
		{
			Type: "section",
			Text: &SlackText{
				Type: "mrkdwn",
				Text: fmt.Sprintf("*%s* さん\n\n新しい経費申請の承認をお願いします。", approverName),
			},
		},
		{
			Type: "section",
			Fields: []SlackField{
				{
					Type: "mrkdwn",
					Text: fmt.Sprintf("*申請者:*\n%s", expense.User.Name),
				},
				{
					Type: "mrkdwn",
					Text: fmt.Sprintf("*金額:*\n%d円", expense.Amount),
				},
				{
					Type: "mrkdwn",
					Text: fmt.Sprintf("*タイトル:*\n%s", expense.Title),
				},
				{
					Type: "mrkdwn",
					Text: fmt.Sprintf("*発生日:*\n%s", expense.ExpenseDate.Format("2006/01/02")),
				},
			},
		},
		{
			Type: "section",
			Text: &SlackText{
				Type: "mrkdwn",
				Text: fmt.Sprintf("*説明:*\n%s", expense.Description),
			},
		},
		{
			Type: "actions",
			Elements: []SlackBlockElement{
				{
					Type: "button",
					Text: &SlackText{
						Type: "plain_text",
						Text: "承認画面へ",
					},
					Value:    "view_expense",
					URL:      fmt.Sprintf("%s/admin/expenses/pending", s.config.SystemURL),
					ActionID: "view_expense",
					Style:    "primary",
				},
			},
		},
	}

	return s.SendRichMessage(ctx, fmt.Sprintf("@%s", userID), blocks)
}

// SendExpenseApprovedNotice 経費申請承認通知を送信（申請者向け）
func (s *slackService) SendExpenseApprovedNotice(ctx context.Context, userID string, expense *model.Expense, approverName string, isFullyApproved bool) error {
	var headerText, statusText string
	if isFullyApproved {
		headerText = "✅ 経費申請が承認されました"
		statusText = fmt.Sprintf("あなたの経費申請「*%s*」（%d円）が全ての承認を得て完了しました。",
			expense.Title, expense.Amount)
	} else {
		headerText = "✅ 経費申請が一次承認されました"
		statusText = fmt.Sprintf("あなたの経費申請「*%s*」（%d円）が%sさんに承認されました。\n次の承認者の確認を待っています。",
			expense.Title, expense.Amount, approverName)
	}

	blocks := []SlackBlock{
		{
			Type: "header",
			Text: &SlackText{
				Type: "plain_text",
				Text: headerText,
			},
		},
		{
			Type: "section",
			Text: &SlackText{
				Type: "mrkdwn",
				Text: statusText,
			},
		},
		{
			Type: "actions",
			Elements: []SlackBlockElement{
				{
					Type: "button",
					Text: &SlackText{
						Type: "plain_text",
						Text: "詳細を確認",
					},
					Value:    "view_expense",
					URL:      fmt.Sprintf("%s/expenses/%s", s.config.SystemURL, expense.ID.String()),
					ActionID: "view_expense",
					Style:    "primary",
				},
			},
		},
	}

	return s.SendRichMessage(ctx, fmt.Sprintf("@%s", userID), blocks)
}

// SendExpenseRejectedNotice 経費申請却下通知を送信（申請者向け）
func (s *slackService) SendExpenseRejectedNotice(ctx context.Context, userID string, expense *model.Expense, rejectorName string, reason string) error {
	blocks := []SlackBlock{
		{
			Type: "header",
			Text: &SlackText{
				Type: "plain_text",
				Text: "❌ 経費申請が却下されました",
			},
		},
		{
			Type: "section",
			Text: &SlackText{
				Type: "mrkdwn",
				Text: fmt.Sprintf("あなたの経費申請「*%s*」（%d円）が%sさんによって却下されました。",
					expense.Title, expense.Amount, rejectorName),
			},
		},
		{
			Type: "section",
			Text: &SlackText{
				Type: "mrkdwn",
				Text: fmt.Sprintf("*却下理由:*\n%s", reason),
			},
		},
		{
			Type: "section",
			Text: &SlackText{
				Type: "mrkdwn",
				Text: "修正が必要な場合は、新しい申請として再提出してください。",
			},
		},
		{
			Type: "actions",
			Elements: []SlackBlockElement{
				{
					Type: "button",
					Text: &SlackText{
						Type: "plain_text",
						Text: "経費申請一覧へ",
					},
					Value:    "view_expenses",
					URL:      fmt.Sprintf("%s/expenses", s.config.SystemURL),
					ActionID: "view_expenses",
				},
			},
		},
	}

	return s.SendRichMessage(ctx, fmt.Sprintf("@%s", userID), blocks)
}

// SendExpenseLimitWarning 経費申請上限警告を送信
func (s *slackService) SendExpenseLimitWarning(ctx context.Context, userID string, limitType string, usageRate float64, currentAmount, limitAmount int) error {
	limitTypeLabel := "月次"
	if limitType == "yearly" {
		limitTypeLabel = "年次"
	}

	remainingAmount := limitAmount - currentAmount
	if remainingAmount < 0 {
		remainingAmount = 0
	}

	// 警告レベルに応じた絵文字を設定
	var emoji string
	if usageRate >= 90 {
		emoji = "🚨"
	} else if usageRate >= 80 {
		emoji = "⚠️"
	} else {
		emoji = "📊"
	}

	blocks := []SlackBlock{
		{
			Type: "header",
			Text: &SlackText{
				Type: "plain_text",
				Text: fmt.Sprintf("%s %s経費申請上限警告", emoji, limitTypeLabel),
			},
		},
		{
			Type: "section",
			Text: &SlackText{
				Type: "mrkdwn",
				Text: fmt.Sprintf("*%s経費申請上限の%.0f%%を使用しています。*\n計画的な申請をお願いします。",
					limitTypeLabel, usageRate),
			},
		},
		{
			Type: "section",
			Fields: []SlackField{
				{
					Type: "mrkdwn",
					Text: fmt.Sprintf("*現在の使用額:*\n%d円", currentAmount),
				},
				{
					Type: "mrkdwn",
					Text: fmt.Sprintf("*%s上限額:*\n%d円", limitTypeLabel, limitAmount),
				},
				{
					Type: "mrkdwn",
					Text: fmt.Sprintf("*残額:*\n%d円", remainingAmount),
				},
				{
					Type: "mrkdwn",
					Text: fmt.Sprintf("*使用率:*\n%.1f%%", usageRate),
				},
			},
		},
		{
			Type: "actions",
			Elements: []SlackBlockElement{
				{
					Type: "button",
					Text: &SlackText{
						Type: "plain_text",
						Text: "経費申請状況を確認",
					},
					Value:    "view_expenses",
					URL:      fmt.Sprintf("%s/expenses", s.config.SystemURL),
					ActionID: "view_expenses",
				},
			},
		},
	}

	return s.SendRichMessage(ctx, fmt.Sprintf("@%s", userID), blocks)
}
