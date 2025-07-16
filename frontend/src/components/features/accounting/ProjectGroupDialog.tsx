// プロジェクトグループ作成・編集ダイアログコンポーネント

import React, { useEffect, useMemo } from "react";
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
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Divider,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Autocomplete,
  RadioGroup,
  Radio,
  InputAdornment,
  FormHelperText,
} from "@mui/material";
import {
  Close,
  Save,
  Cancel,
  GroupAdd,
  Business,
  AttachMoney,
  Assignment,
  NavigateNext,
  NavigateBefore,
  Info,
  Warning,
} from "@mui/icons-material";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  ProjectGroup,
  CreateProjectGroupRequest,
  UpdateProjectGroupRequest,
  BillingCalculationType,
  Client,
  Project,
} from "../../../types/accounting";
import {
  BILLING_CALCULATION_TYPE,
  BILLING_CALCULATION_TYPE_LABELS,
  BILLING_CALCULATION_TYPE_DESCRIPTIONS,
  VALIDATION_RULES,
  VALIDATION_MESSAGES,
  PROJECT_GROUP_STATUS,
} from "../../../constants/accounting";

// ========== 型定義 ==========

export interface ProjectGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (
    data: CreateProjectGroupRequest | UpdateProjectGroupRequest,
  ) => Promise<void>;
  projectGroup?: ProjectGroup | null;
  clients: Client[];
  projects: Project[];
  loading?: boolean;
  mode?: "create" | "edit";
}

interface FormData {
  name: string;
  description?: string;
  billingCalculationType: BillingCalculationType;
  defaultHourlyRate?: number;
  upperLimitHours?: number;
  lowerLimitHours?: number;
  isActive: boolean;
  clientIds: string[];
  projectIds: string[];
}

// ========== バリデーションスキーマ ==========

const validationSchema = yup.object().shape({
  name: yup
    .string()
    .required(VALIDATION_MESSAGES.REQUIRED)
    .min(
      VALIDATION_RULES.PROJECT_GROUP_NAME.MIN_LENGTH,
      VALIDATION_MESSAGES.MIN_LENGTH(
        VALIDATION_RULES.PROJECT_GROUP_NAME.MIN_LENGTH,
      ),
    )
    .max(
      VALIDATION_RULES.PROJECT_GROUP_NAME.MAX_LENGTH,
      VALIDATION_MESSAGES.MAX_LENGTH(
        VALIDATION_RULES.PROJECT_GROUP_NAME.MAX_LENGTH,
      ),
    ),
  description: yup.string().optional(),
  billingCalculationType: yup
    .string()
    .oneOf(Object.values(BILLING_CALCULATION_TYPE))
    .required(VALIDATION_MESSAGES.REQUIRED),
  defaultHourlyRate: yup.number().optional(),
  upperLimitHours: yup.number().optional(),
  lowerLimitHours: yup.number().optional(),
  isActive: yup.boolean().required(),
  clientIds: yup
    .array()
    .of(yup.string().required())
    .min(1, "少なくとも1つの取引先を選択してください")
    .required(),
  projectIds: yup.array().of(yup.string().required()).optional(),
});

// ========== メインコンポーネント ==========

export const ProjectGroupDialog: React.FC<ProjectGroupDialogProps> = ({
  open,
  onClose,
  onSave,
  projectGroup,
  clients,
  projects,
  loading = false,
  mode = "create",
}) => {
  const [activeStep, setActiveStep] = React.useState(0);
  const [saving, setSaving] = React.useState(false);

  const defaultValues: FormData = useMemo(
    () => ({
      name: projectGroup?.name || "",
      description: projectGroup?.description || "",
      billingCalculationType:
        projectGroup?.billingCalculationType || BILLING_CALCULATION_TYPE.FIXED,
      defaultHourlyRate: projectGroup?.defaultHourlyRate || undefined,
      upperLimitHours: projectGroup?.upperLimitHours || undefined,
      lowerLimitHours: projectGroup?.lowerLimitHours || undefined,
      isActive: projectGroup?.isActive ?? true,
      clientIds: projectGroup?.clientIds || [],
      projectIds: projectGroup?.projectIds || [],
    }),
    [projectGroup],
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

  const billingCalculationType = watch("billingCalculationType");
  const selectedClientIds = watch("clientIds");

  // ダイアログが開いたときにフォームをリセット
  useEffect(() => {
    if (open) {
      reset(defaultValues);
      setActiveStep(0);
    }
  }, [open, defaultValues, reset]);

  // 選択された取引先に関連するプロジェクトをフィルタリング
  const filteredProjects = useMemo(() => {
    if (!selectedClientIds || selectedClientIds.length === 0) {
      return projects;
    }
    return projects.filter((project) =>
      selectedClientIds.includes(project.clientId),
    );
  }, [selectedClientIds, projects]);

  // ステップの定義
  const steps = [
    { label: "基本情報", icon: <GroupAdd /> },
    { label: "請求設定", icon: <AttachMoney /> },
    { label: "取引先・案件", icon: <Business /> },
    { label: "確認", icon: <Assignment /> },
  ];

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

  // ステップのナビゲーション
  const handleNext = () => {
    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  // ステップコンテンツのレンダリング
  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: // 基本情報
        return (
          <Box sx={{ pt: 2 }}>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="グループ名"
                  fullWidth
                  required
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  placeholder="例: A社SES案件グループ"
                  autoFocus
                />
              )}
            />
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="説明"
                  fullWidth
                  multiline
                  rows={3}
                  error={!!errors.description}
                  helperText={errors.description?.message}
                  placeholder="このグループの用途や特記事項を入力"
                  sx={{ mt: 2 }}
                />
              )}
            />
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch {...field} checked={field.value} />}
                  label="有効にする"
                  sx={{ mt: 2 }}
                />
              )}
            />
          </Box>
        );

      case 1: // 請求設定
        return (
          <Box sx={{ pt: 2 }}>
            <Controller
              name="billingCalculationType"
              control={control}
              render={({ field }) => (
                <FormControl component="fieldset" fullWidth>
                  <FormLabel component="legend">請求計算タイプ</FormLabel>
                  <RadioGroup {...field}>
                    {Object.entries(BILLING_CALCULATION_TYPE_LABELS).map(
                      ([value, label]) => (
                        <FormControlLabel
                          key={value}
                          value={value}
                          control={<Radio />}
                          label={
                            <Box>
                              <Typography variant="body1">{label}</Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {
                                  BILLING_CALCULATION_TYPE_DESCRIPTIONS[
                                    value as BillingCalculationType
                                  ]
                                }
                              </Typography>
                            </Box>
                          }
                          sx={{ my: 1 }}
                        />
                      ),
                    )}
                  </RadioGroup>
                </FormControl>
              )}
            />

            <Controller
              name="defaultHourlyRate"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="デフォルト時給"
                  type="number"
                  fullWidth
                  error={!!errors.defaultHourlyRate}
                  helperText={errors.defaultHourlyRate?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">¥</InputAdornment>
                    ),
                  }}
                  sx={{ mt: 3 }}
                />
              )}
            />

            {billingCalculationType ===
              BILLING_CALCULATION_TYPE.VARIABLE_UPPER_LOWER && (
              <>
                <Controller
                  name="upperLimitHours"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="上限時間"
                      type="number"
                      fullWidth
                      required
                      error={!!errors.upperLimitHours}
                      helperText={errors.upperLimitHours?.message}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">時間</InputAdornment>
                        ),
                      }}
                      sx={{ mt: 2 }}
                    />
                  )}
                />
                <Controller
                  name="lowerLimitHours"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="下限時間"
                      type="number"
                      fullWidth
                      required
                      error={!!errors.lowerLimitHours}
                      helperText={errors.lowerLimitHours?.message}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">時間</InputAdornment>
                        ),
                      }}
                      sx={{ mt: 2 }}
                    />
                  )}
                />
              </>
            )}
          </Box>
        );

      case 2: // 取引先・案件
        return (
          <Box sx={{ pt: 2 }}>
            <Controller
              name="clientIds"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  {...field}
                  multiple
                  options={clients}
                  getOptionLabel={(option) => option.name}
                  value={clients.filter((c) => field.value.includes(c.id))}
                  onChange={(_, newValue) => {
                    const newIds = newValue.map((v) => v.id);
                    field.onChange(newIds);
                    // 取引先が変更されたら、関連しないプロジェクトを除外
                    const currentProjectIds = watch("projectIds");
                    const validProjectIds = currentProjectIds.filter((pid) =>
                      projects.some(
                        (p) => p.id === pid && newIds.includes(p.clientId),
                      ),
                    );
                    setValue("projectIds", validProjectIds);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="取引先"
                      required
                      error={!!errors.clientIds}
                      helperText={errors.clientIds?.message}
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option.name}
                        {...getTagProps({ index })}
                      />
                    ))
                  }
                />
              )}
            />

            <Controller
              name="projectIds"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  {...field}
                  multiple
                  options={filteredProjects}
                  getOptionLabel={(option) => option.name}
                  value={filteredProjects.filter((p) =>
                    field.value.includes(p.id),
                  )}
                  onChange={(_, newValue) => {
                    field.onChange(newValue.map((v) => v.id));
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="案件"
                      helperText={
                        selectedClientIds.length === 0
                          ? "取引先を選択すると関連する案件が表示されます"
                          : `${filteredProjects.length}件の案件から選択`
                      }
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option.name}
                        size="small"
                        {...getTagProps({ index })}
                      />
                    ))
                  }
                  sx={{ mt: 2 }}
                  disabled={selectedClientIds.length === 0}
                />
              )}
            />
          </Box>
        );

      case 3: // 確認
        const formData = watch();
        return (
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              以下の内容でプロジェクトグループを
              {mode === "create" ? "作成" : "更新"}します
            </Alert>

            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  グループ名
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {formData.name}
                </Typography>
              </Box>

              {formData.description && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    説明
                  </Typography>
                  <Typography variant="body2">
                    {formData.description}
                  </Typography>
                </Box>
              )}

              <Box>
                <Typography variant="caption" color="text.secondary">
                  請求計算タイプ
                </Typography>
                <Typography variant="body1">
                  {
                    BILLING_CALCULATION_TYPE_LABELS[
                      formData.billingCalculationType
                    ]
                  }
                </Typography>
              </Box>

              {formData.defaultHourlyRate && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    デフォルト時給
                  </Typography>
                  <Typography variant="body1">
                    ¥{formData.defaultHourlyRate.toLocaleString()}
                  </Typography>
                </Box>
              )}

              {formData.billingCalculationType ===
                BILLING_CALCULATION_TYPE.VARIABLE_UPPER_LOWER && (
                <>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      上限・下限時間
                    </Typography>
                    <Typography variant="body1">
                      {formData.lowerLimitHours}時間 〜{" "}
                      {formData.upperLimitHours}時間
                    </Typography>
                  </Box>
                </>
              )}

              <Box>
                <Typography variant="caption" color="text.secondary">
                  取引先
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  {clients
                    .filter((c) => formData.clientIds.includes(c.id))
                    .map((client) => (
                      <Chip
                        key={client.id}
                        label={client.name}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                </Box>
              </Box>

              {formData.projectIds.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    案件
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {projects
                      .filter((p) => formData.projectIds.includes(p.id))
                      .map((project) => (
                        <Chip
                          key={project.id}
                          label={project.name}
                          size="small"
                          variant="outlined"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                  </Box>
                </Box>
              )}

              <Box>
                <Typography variant="caption" color="text.secondary">
                  ステータス
                </Typography>
                <Chip
                  label={formData.isActive ? "有効" : "無効"}
                  color={formData.isActive ? "success" : "default"}
                  size="small"
                />
              </Box>
            </Stack>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: 600 },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">
            プロジェクトグループ{mode === "create" ? "作成" : "編集"}
          </Typography>
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
          <>
            <Stepper activeStep={activeStep} orientation="vertical">
              {steps.map((step, index) => (
                <Step key={step.label}>
                  <StepLabel
                    StepIconComponent={() => (
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          bgcolor:
                            activeStep >= index ? "primary.main" : "grey.300",
                          color: "white",
                        }}
                      >
                        {step.icon}
                      </Box>
                    )}
                  >
                    {step.label}
                  </StepLabel>
                  <StepContent>{renderStepContent(index)}</StepContent>
                </Step>
              ))}
            </Stepper>
          </>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          キャンセル
        </Button>
        {activeStep > 0 && (
          <Button
            onClick={handleBack}
            disabled={saving}
            startIcon={<NavigateBefore />}
          >
            戻る
          </Button>
        )}
        {activeStep < steps.length - 1 ? (
          <Button
            onClick={handleNext}
            variant="contained"
            disabled={saving}
            endIcon={<NavigateNext />}
          >
            次へ
          </Button>
        ) : (
          <Button
            onClick={handleSubmit(onSubmit)}
            variant="contained"
            disabled={saving || !isValid}
            startIcon={saving ? <CircularProgress size={20} /> : <Save />}
          >
            {mode === "create" ? "作成" : "更新"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

// ========== 簡易版ダイアログ（一覧画面でのクイック作成用） ==========

export interface QuickProjectGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: CreateProjectGroupRequest) => Promise<void>;
  clients: Client[];
}

export const QuickProjectGroupDialog: React.FC<
  QuickProjectGroupDialogProps
> = ({ open, onClose, onSave, clients }) => {
  const [saving, setSaving] = React.useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<CreateProjectGroupRequest>({
    defaultValues: {
      name: "",
      billingCalculationType: BILLING_CALCULATION_TYPE.FIXED,
      isActive: true,
      clientIds: [],
      projectIds: [],
    },
    resolver: yupResolver(
      yup.object().shape({
        name: yup.string().required(VALIDATION_MESSAGES.REQUIRED),
        billingCalculationType: yup.string().required(),
        isActive: yup.boolean().required(),
        clientIds: yup
          .array()
          .of(yup.string().required())
          .min(1, "少なくとも1つの取引先を選択してください")
          .required(),
        projectIds: yup.array().of(yup.string().required()).optional(),
      }),
    ),
    mode: "onChange",
  });

  useEffect(() => {
    if (open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (data: CreateProjectGroupRequest) => {
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>プロジェクトグループをクイック作成</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="グループ名"
                fullWidth
                required
                error={!!errors.name}
                helperText={errors.name?.message}
                autoFocus
              />
            )}
          />
          <Controller
            name="clientIds"
            control={control}
            render={({ field }) => (
              <Autocomplete
                {...field}
                multiple
                options={clients}
                getOptionLabel={(option) => option.name}
                value={clients.filter((c) => field.value.includes(c.id))}
                onChange={(_, newValue) => {
                  field.onChange(newValue.map((v) => v.id));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="取引先"
                    required
                    error={!!errors.clientIds}
                    helperText={errors.clientIds?.message}
                  />
                )}
                sx={{ mt: 2 }}
              />
            )}
          />
          <Alert severity="info" sx={{ mt: 2 }}>
            詳細な設定は作成後に編集画面で行えます
          </Alert>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          キャンセル
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          disabled={saving || !isValid}
          startIcon={saving ? <CircularProgress size={20} /> : <Save />}
        >
          作成
        </Button>
      </DialogActions>
    </Dialog>
  );
};
