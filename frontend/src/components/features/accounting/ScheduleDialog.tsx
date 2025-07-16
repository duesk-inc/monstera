// スケジュール作成・編集ダイアログコンポーネント

import React, { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  FormLabel,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Chip,
  Stack,
  Select,
  MenuItem,
  InputLabel,
  Autocomplete,
  Divider,
  Card,
  CardContent,
  FormHelperText,
  RadioGroup,
  Radio,
  Grid,
} from "@mui/material";
import {
  Close,
  Save,
  Schedule,
  Info,
  Warning,
  PlayArrow,
  AccessTime,
  Event,
  Sync,
  Receipt,
} from "@mui/icons-material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  ScheduledJob,
  CreateScheduleRequest,
  UpdateScheduleRequest,
  ScheduleStatus,
  Client,
} from "../../../types/accounting";
import {
  SCHEDULE_STATUS,
  SCHEDULE_STATUS_LABELS,
  CRON_PRESETS,
  VALIDATION_RULES,
  VALIDATION_MESSAGES,
} from "../../../constants/accounting";

// ========== 型定義 ==========

export interface ScheduleDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (
    data: CreateScheduleRequest | UpdateScheduleRequest,
  ) => Promise<void>;
  schedule?: ScheduledJob | null;
  clients?: Client[];
  loading?: boolean;
  mode?: "create" | "edit";
}

interface FormData {
  name: string;
  type: "billing" | "freee_sync";
  cronExpression: string;
  isActive: boolean;
  parameters: {
    clientIds?: string[];
    sendToFreee?: boolean;
    month?: string;
    syncType?: string;
  };
}

// ========== バリデーションスキーマ ==========

const validationSchema = yup.object().shape({
  name: yup
    .string()
    .required(VALIDATION_MESSAGES.REQUIRED)
    .min(
      VALIDATION_RULES.SCHEDULE_NAME.MIN_LENGTH,
      VALIDATION_MESSAGES.MIN_LENGTH(VALIDATION_RULES.SCHEDULE_NAME.MIN_LENGTH),
    )
    .max(
      VALIDATION_RULES.SCHEDULE_NAME.MAX_LENGTH,
      VALIDATION_MESSAGES.MAX_LENGTH(VALIDATION_RULES.SCHEDULE_NAME.MAX_LENGTH),
    ),
  type: yup
    .string()
    .oneOf(["billing", "freee_sync"])
    .required(VALIDATION_MESSAGES.REQUIRED),
  cronExpression: yup
    .string()
    .required(VALIDATION_MESSAGES.REQUIRED)
    .matches(
      VALIDATION_RULES.CRON_EXPRESSION.PATTERN,
      VALIDATION_MESSAGES.INVALID_CRON,
    ),
  isActive: yup.boolean().required(),
  parameters: yup.object().optional(),
});

// ========== ユーティリティ関数 ==========

// Cron式を人間が読める形式に変換
const parseCronExpression = (cron: string): string => {
  try {
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) return "不正な形式";

    const [minute, hour, day, month, dayOfWeek] = parts;

    // プリセットと一致するかチェック
    const preset = Object.entries(CRON_PRESETS).find(
      ([_, preset]) => preset.expression === cron,
    );
    if (preset) return preset[1].label;

    // 基本的なパターンを解析
    if (minute === "0" && hour !== "*" && day === "*" && month === "*") {
      if (dayOfWeek === "*") {
        return `毎日 ${hour}:00`;
      } else if (dayOfWeek === "1-5") {
        return `平日 ${hour}:00`;
      } else if (dayOfWeek === "1") {
        return `毎週月曜 ${hour}:00`;
      }
    }

    if (minute === "0" && hour !== "*" && day === "1" && month === "*") {
      return `毎月1日 ${hour}:00`;
    }

    return "カスタム設定";
  } catch {
    return "不正な形式";
  }
};

// 次回実行日時を計算（簡易版）
const getNextExecution = (cron: string): string => {
  try {
    // 実際の実装では cron パーサーライブラリを使用
    const now = new Date();
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) return "計算不可";

    const [minute, hour] = parts;
    const nextDate = new Date(now);

    if (minute !== "*" && hour !== "*") {
      nextDate.setHours(parseInt(hour), parseInt(minute), 0, 0);
      if (nextDate <= now) {
        nextDate.setDate(nextDate.getDate() + 1);
      }
      return nextDate.toLocaleDateString("ja-JP", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return "計算不可";
  } catch {
    return "計算不可";
  }
};

// ========== メインコンポーネント ==========

export const ScheduleDialog: React.FC<ScheduleDialogProps> = ({
  open,
  onClose,
  onSave,
  schedule,
  clients = [],
  loading = false,
  mode = "create",
}) => {
  const [saving, setSaving] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>("");

  const defaultValues: FormData = useMemo(
    () => ({
      name: schedule?.name || "",
      type: (schedule?.type as "billing" | "freee_sync") || "billing",
      cronExpression: schedule?.cronExpression || "",
      isActive: schedule?.isActive ?? true,
      parameters: schedule?.parameters || {},
    }),
    [schedule],
  );

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    reset,
    setValue,
  } = useForm<FormData>({
    defaultValues,
    resolver: yupResolver(validationSchema),
    mode: "onChange",
  });

  const watchedType = watch("type");
  const watchedCron = watch("cronExpression");

  // ダイアログが開いたときにフォームをリセット
  useEffect(() => {
    if (open) {
      reset(defaultValues);
      setSelectedPreset("");
    }
  }, [open, defaultValues, reset]);

  // プリセット選択時の処理
  const handlePresetChange = (presetKey: string) => {
    if (presetKey && CRON_PRESETS[presetKey as keyof typeof CRON_PRESETS]) {
      const preset = CRON_PRESETS[presetKey as keyof typeof CRON_PRESETS];
      setValue("cronExpression", preset.expression);
      setSelectedPreset(presetKey);
    }
  };

  // カスタムCron式入力時の処理
  const handleCronChange = (value: string) => {
    setValue("cronExpression", value);
    // プリセットと一致するかチェック
    const matchingPreset = Object.entries(CRON_PRESETS).find(
      ([_, preset]) => preset.expression === value,
    );
    setSelectedPreset(matchingPreset ? matchingPreset[0] : "");
  };

  // フォーム送信処理
  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      await onSave(data);
      onClose();
    } catch (error) {
      // エラーハンドリングは親コンポーネントで行う
    } finally {
      setSaving(false);
    }
  };

  // スケジュールタイプに応じたパラメータの描画
  const renderTypeSpecificParameters = () => {
    switch (watchedType) {
      case "billing":
        return (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              請求処理設定
            </Typography>
            <Controller
              name="parameters.clientIds"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  {...field}
                  multiple
                  options={clients}
                  getOptionLabel={(option) => option.name}
                  value={
                    clients.filter((c) => (field.value || []).includes(c.id)) ||
                    []
                  }
                  onChange={(_, newValue) => {
                    field.onChange(newValue.map((v) => v.id));
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="対象取引先"
                      helperText="空の場合は全ての取引先が対象になります"
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option.name}
                        {...getTagProps({ index })}
                        key={option.id}
                      />
                    ))
                  }
                />
              )}
            />
            <Controller
              name="parameters.sendToFreee"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch {...field} checked={field.value || false} />}
                  label="freeeに自動送信"
                  sx={{ mt: 2 }}
                />
              )}
            />
          </Box>
        );

      case "freee_sync":
        return (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              freee同期設定
            </Typography>
            <Controller
              name="parameters.syncType"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>同期タイプ</InputLabel>
                  <Select {...field} value={field.value || "full"}>
                    <MenuItem value="full">完全同期</MenuItem>
                    <MenuItem value="incremental">差分同期</MenuItem>
                    <MenuItem value="partners">取引先のみ</MenuItem>
                    <MenuItem value="invoices">請求書のみ</MenuItem>
                  </Select>
                  <FormHelperText>
                    完全同期は時間がかかりますが、データの整合性が保たれます
                  </FormHelperText>
                </FormControl>
              )}
            />
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <Schedule color="primary" />
            <Typography variant="h6">
              スケジュール{mode === "create" ? "作成" : "編集"}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent>
        {loading ? (
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            minHeight={400}
          >
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ pt: 2 }}>
            {/* 基本情報 */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  基本情報
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Controller
                      name="name"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="スケジュール名"
                          fullWidth
                          required
                          error={!!errors.name}
                          helperText={errors.name?.message}
                          placeholder="例: 月次請求処理（A社）"
                          autoFocus
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="type"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth required>
                          <FormLabel component="legend">処理タイプ</FormLabel>
                          <RadioGroup {...field} row>
                            <FormControlLabel
                              value="billing"
                              control={<Radio />}
                              label={
                                <Box
                                  display="flex"
                                  alignItems="center"
                                  gap={0.5}
                                >
                                  <Receipt fontSize="small" />
                                  請求処理
                                </Box>
                              }
                            />
                            <FormControlLabel
                              value="freee_sync"
                              control={<Radio />}
                              label={
                                <Box
                                  display="flex"
                                  alignItems="center"
                                  gap={0.5}
                                >
                                  <Sync fontSize="small" />
                                  freee同期
                                </Box>
                              }
                            />
                          </RadioGroup>
                        </FormControl>
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="isActive"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={<Switch {...field} checked={field.value} />}
                          label="有効にする"
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* スケジュール設定 */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  実行スケジュール
                </Typography>

                {/* プリセット選択 */}
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>プリセット</InputLabel>
                  <Select
                    value={selectedPreset}
                    onChange={(e) => handlePresetChange(e.target.value)}
                  >
                    <MenuItem value="">カスタム</MenuItem>
                    {Object.entries(CRON_PRESETS).map(([key, preset]) => (
                      <MenuItem key={key} value={key}>
                        {preset.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Cron式入力 */}
                <Controller
                  name="cronExpression"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Cron式"
                      fullWidth
                      required
                      error={!!errors.cronExpression}
                      helperText={
                        errors.cronExpression?.message ||
                        "形式: 分 時 日 月 曜日 (例: 0 9 * * 1-5 = 平日9時)"
                      }
                      onChange={(e) => {
                        field.onChange(e);
                        handleCronChange(e.target.value);
                      }}
                    />
                  )}
                />

                {/* プレビュー情報 */}
                {watchedCron && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Stack spacing={1}>
                      <Box>
                        <Typography variant="caption">
                          実行タイミング:
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {parseCronExpression(watchedCron)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption">次回実行予定:</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {getNextExecution(watchedCron)}
                        </Typography>
                      </Box>
                    </Stack>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* タイプ固有の設定 */}
            <Card>
              <CardContent>{renderTypeSpecificParameters()}</CardContent>
            </Card>

            {/* 注意事項 */}
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                スケジュールは作成後すぐに有効になります。実行時刻にご注意ください。
              </Typography>
            </Alert>
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          キャンセル
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          disabled={saving || !isValid}
          startIcon={saving ? <CircularProgress size={20} /> : <Save />}
        >
          {mode === "create" ? "作成" : "更新"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ========== スケジュール実行確認ダイアログ ==========

export interface ScheduleExecutionDialogProps {
  open: boolean;
  onClose: () => void;
  onExecute: () => Promise<void>;
  schedule: ScheduledJob;
}

export const ScheduleExecutionDialog: React.FC<
  ScheduleExecutionDialogProps
> = ({ open, onClose, onExecute, schedule }) => {
  const [executing, setExecuting] = useState(false);

  const handleExecute = async () => {
    setExecuting(true);
    try {
      await onExecute();
      onClose();
    } catch (error) {
      // エラーハンドリングは親コンポーネントで行う
    } finally {
      setExecuting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <PlayArrow color="primary" />
          スケジュール実行確認
        </Box>
      </DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          以下のスケジュールを今すぐ実行しますか？
        </Alert>
        <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            {schedule.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            タイプ: {schedule.type === "billing" ? "請求処理" : "freee同期"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            通常実行時刻: {parseCronExpression(schedule.cronExpression)}
          </Typography>
        </Box>
        <Alert severity="info" sx={{ mt: 2 }}>
          手動実行は通常のスケジュール実行とは別に行われます。
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={executing}>
          キャンセル
        </Button>
        <Button
          onClick={handleExecute}
          variant="contained"
          disabled={executing}
          startIcon={executing ? <CircularProgress size={20} /> : <PlayArrow />}
        >
          実行
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ========== スケジュール詳細表示ダイアログ ==========

export interface ScheduleDetailDialogProps {
  open: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onExecute?: () => void;
  schedule: ScheduledJob;
}

export const ScheduleDetailDialog: React.FC<ScheduleDetailDialogProps> = ({
  open,
  onClose,
  onEdit,
  onExecute,
  schedule,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <Schedule color="primary" />
            <Typography variant="h6">スケジュール詳細</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 2 }}>
          {/* 基本情報 */}
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                基本情報
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    名前
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {schedule.name}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    タイプ
                  </Typography>
                  <Typography variant="body1">
                    {schedule.type === "billing" ? "請求処理" : "freee同期"}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    ステータス
                  </Typography>
                  <Chip
                    label={SCHEDULE_STATUS_LABELS[schedule.status]}
                    color={
                      schedule.status === "active"
                        ? "success"
                        : schedule.status === "failed"
                          ? "error"
                          : "default"
                    }
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    作成日時
                  </Typography>
                  <Typography variant="body2">
                    {new Date(schedule.createdAt).toLocaleString("ja-JP")}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* スケジュール情報 */}
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                実行スケジュール
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Cron式
                  </Typography>
                  <Typography variant="body1" fontFamily="monospace">
                    {schedule.cronExpression}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    実行タイミング
                  </Typography>
                  <Typography variant="body1">
                    {parseCronExpression(schedule.cronExpression)}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    次回実行予定
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {getNextExecution(schedule.cronExpression)}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* パラメータ情報 */}
          {schedule.parameters &&
            Object.keys(schedule.parameters).length > 0 && (
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    実行パラメータ
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      backgroundColor: "grey.100",
                      p: 2,
                      borderRadius: 1,
                      fontSize: "0.875rem",
                      overflow: "auto",
                    }}
                  >
                    {JSON.stringify(schedule.parameters, null, 2)}
                  </Box>
                </CardContent>
              </Card>
            )}

          {/* 実行履歴 */}
          {schedule.lastExecutedAt && (
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  実行履歴
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      最終実行日時
                    </Typography>
                    <Typography variant="body1">
                      {new Date(schedule.lastExecutedAt).toLocaleString(
                        "ja-JP",
                      )}
                    </Typography>
                  </Grid>
                  {schedule.lastExecutionStatus && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">
                        最終実行結果
                      </Typography>
                      <Chip
                        label={schedule.lastExecutionStatus}
                        color={
                          schedule.lastExecutionStatus === "completed"
                            ? "success"
                            : "error"
                        }
                        size="small"
                      />
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          )}
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>閉じる</Button>
        {onExecute && schedule.status === "active" && (
          <Button
            onClick={onExecute}
            variant="outlined"
            startIcon={<PlayArrow />}
          >
            今すぐ実行
          </Button>
        )}
        {onEdit && (
          <Button onClick={onEdit} variant="contained" startIcon={<Schedule />}>
            編集
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
