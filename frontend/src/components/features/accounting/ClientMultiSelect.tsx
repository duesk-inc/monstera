// 取引先複数選択コンポーネント

import React, { useMemo, useState } from "react";
import {
  Autocomplete,
  TextField,
  Chip,
  Box,
  Avatar,
  Typography,
  CircularProgress,
  Alert,
  FormControl,
  FormLabel,
  FormHelperText,
  InputAdornment,
  IconButton,
  Tooltip,
  Stack,
  Checkbox,
  ListItemText,
  Paper,
  Button,
  Divider,
} from "@mui/material";
import {
  Business,
  Search,
  Clear,
  CheckBox,
  CheckBoxOutlineBlank,
  Add,
  FilterList,
  Sort,
} from "@mui/icons-material";
import { Client } from "../../../types/accounting";

// ========== 型定義 ==========

export interface ClientMultiSelectProps {
  value: string[];
  onChange: (clientIds: string[]) => void;
  clients: Client[];
  loading?: boolean;
  error?: boolean;
  errorMessage?: string;
  label?: string;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  maxSelections?: number;
  allowSelectAll?: boolean;
  showAvatars?: boolean;
  showInactive?: boolean;
  onCreateNew?: () => void;
  onRefresh?: () => void;
  variant?: "outlined" | "filled" | "standard";
  size?: "small" | "medium";
  fullWidth?: boolean;
  readOnly?: boolean;
  searchable?: boolean;
  groupBy?: "status" | "none";
  sortBy?: "name" | "created" | "none";
  filterBy?: {
    status?: boolean;
    search?: string;
  };
}

export interface ClientOption extends Client {
  groupLabel?: string;
}

// ========== ユーティリティ関数 ==========

// クライアントのフィルタリング
const filterClients = (
  clients: Client[],
  showInactive: boolean,
  searchTerm: string,
): Client[] => {
  return clients.filter((client) => {
    // アクティブ状態のフィルタ
    if (!showInactive && !client.isActive) {
      return false;
    }

    // 検索フィルタ
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        client.name.toLowerCase().includes(search) ||
        client.email?.toLowerCase().includes(search) ||
        client.address?.toLowerCase().includes(search)
      );
    }

    return true;
  });
};

// クライアントのソート
const sortClients = (clients: Client[], sortBy: string): Client[] => {
  const sorted = [...clients];

  switch (sortBy) {
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "ja"));
    case "created":
      return sorted.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    default:
      return sorted;
  }
};

// クライアントのグループ化
const groupClients = (clients: Client[], groupBy: string): ClientOption[] => {
  if (groupBy === "none") {
    return clients;
  }

  const grouped = clients.reduce(
    (acc, client) => {
      let groupLabel = "";

      switch (groupBy) {
        case "status":
          groupLabel = client.isActive ? "アクティブ" : "非アクティブ";
          break;
        default:
          groupLabel = "その他";
      }

      if (!acc[groupLabel]) {
        acc[groupLabel] = [];
      }
      acc[groupLabel].push({ ...client, groupLabel });
      return acc;
    },
    {} as Record<string, ClientOption[]>,
  );

  // フラット化してグループラベル順に並べる
  const result: ClientOption[] = [];
  Object.keys(grouped)
    .sort()
    .forEach((groupLabel) => {
      result.push(...grouped[groupLabel]);
    });

  return result;
};

// クライアント名の取得（表示用）
const getClientDisplayName = (client: Client): string => {
  return client.name;
};

// クライアントの説明テキスト取得
const getClientDescription = (client: Client): string => {
  const parts: string[] = [];
  if (client.email) parts.push(client.email);
  if (client.address) parts.push(client.address);
  if (!client.isActive) parts.push("非アクティブ");
  return parts.join(" • ");
};

// ========== メインコンポーネント ==========

export const ClientMultiSelect: React.FC<ClientMultiSelectProps> = ({
  value,
  onChange,
  clients,
  loading = false,
  error = false,
  errorMessage,
  label = "取引先",
  placeholder = "取引先を選択してください",
  helperText,
  required = false,
  disabled = false,
  maxSelections,
  allowSelectAll = true,
  showAvatars = true,
  showInactive = false,
  onCreateNew,
  onRefresh,
  variant = "outlined",
  size = "medium",
  fullWidth = true,
  readOnly = false,
  searchable = true,
  groupBy = "none",
  sortBy = "name",
  filterBy = {} as {
    status?: boolean;
    search?: string;
  },
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactiveLocal, setShowInactiveLocal] = useState(showInactive);

  // フィルタリング、ソート、グループ化されたクライアント
  const processedClients = useMemo(() => {
    let filtered = filterClients(
      clients,
      showInactiveLocal,
      filterBy?.search || searchTerm,
    );
    filtered = sortClients(filtered, sortBy);
    return groupClients(filtered, groupBy);
  }, [
    clients,
    showInactiveLocal,
    searchTerm,
    filterBy?.search,
    sortBy,
    groupBy,
  ]);

  // 選択されたクライアント
  const selectedClients = useMemo(() => {
    return clients.filter((client) => value.includes(client.id));
  }, [clients, value]);

  // 全選択/全解除
  const handleSelectAll = () => {
    if (selectedClients.length === processedClients.length) {
      // 全解除
      onChange([]);
    } else {
      // 全選択
      const allIds = processedClients.map((client) => client.id);
      onChange(allIds);
    }
  };

  // 選択制限チェック
  const isSelectionLimited = (newValue: Client[]) => {
    if (!maxSelections) return false;
    return newValue.length > maxSelections;
  };

  // 選択変更ハンドラ
  const handleChange = (event: any, newValue: Client[]) => {
    if (isSelectionLimited(newValue)) {
      return; // 制限を超える場合は変更しない
    }
    onChange(newValue.map((client) => client.id));
  };

  // カスタムオプションレンダリング
  const renderOption = (props: any, option: Client, { selected }: any) => (
    <li {...props}>
      <Box
        component="div"
        sx={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          py: 1,
        }}
      >
        <Checkbox
          icon={<CheckBoxOutlineBlank fontSize="small" />}
          checkedIcon={<CheckBox fontSize="small" />}
          style={{ marginRight: 8 }}
          checked={selected}
          size={size as "small" | "medium" | "large"}
        />
        {showAvatars && (
          <Avatar
            sx={{
              width: size === "small" ? 24 : 32,
              height: size === "small" ? 24 : 32,
              mr: 1,
              bgcolor: option.isActive ? "primary.main" : "grey.400",
            }}
          >
            <Business fontSize="small" />
          </Avatar>
        )}
        <Box flex={1}>
          <Typography variant="body2" fontWeight={500}>
            {getClientDisplayName(option)}
          </Typography>
          {getClientDescription(option) && (
            <Typography variant="caption" color="text.secondary">
              {getClientDescription(option)}
            </Typography>
          )}
        </Box>
      </Box>
    </li>
  );

  // カスタムタグレンダリング
  const renderTags = (tagValue: Client[], getTagProps: any) =>
    tagValue.map((option, index) => (
      <Chip
        variant="outlined"
        label={getClientDisplayName(option)}
        size={size}
        avatar={
          showAvatars ? (
            <Avatar
              sx={{ bgcolor: option.isActive ? "primary.main" : "grey.400" }}
            >
              <Business fontSize="small" />
            </Avatar>
          ) : undefined
        }
        {...getTagProps({ index })}
        key={option.id}
        sx={{
          opacity: option.isActive ? 1 : 0.7,
        }}
      />
    ));

  // グループ化のラベル表示
  const getOptionGroupLabel = (option: ClientOption) => option.groupLabel || "";

  // エラー表示
  if (error && !loading) {
    return (
      <FormControl fullWidth={fullWidth} error>
        <FormLabel component="legend">{label}</FormLabel>
        <Alert severity="error" sx={{ mt: 1 }}>
          {errorMessage || "取引先の読み込みに失敗しました"}
          {onRefresh && (
            <Button
              size="small"
              onClick={onRefresh}
              sx={{ ml: 1 }}
              startIcon={<Search />}
            >
              再読み込み
            </Button>
          )}
        </Alert>
      </FormControl>
    );
  }

  return (
    <FormControl fullWidth={fullWidth} required={required}>
      {label && <FormLabel component="legend">{label}</FormLabel>}

      <Box sx={{ mt: label ? 1 : 0 }}>
        {/* コントロールバー */}
        {(searchable || allowSelectAll || onCreateNew) && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            {searchable && (
              <TextField
                size="small"
                placeholder="取引先を検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setSearchTerm("")}
                      >
                        <Clear fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ flexGrow: 1 }}
              />
            )}

            {allowSelectAll && processedClients.length > 0 && (
              <Tooltip
                title={
                  selectedClients.length === processedClients.length
                    ? "全て選択解除"
                    : "全て選択"
                }
              >
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleSelectAll}
                  disabled={disabled}
                >
                  {selectedClients.length === processedClients.length
                    ? "全解除"
                    : "全選択"}
                </Button>
              </Tooltip>
            )}

            {onCreateNew && (
              <Tooltip title="新しい取引先を作成">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={onCreateNew}
                  startIcon={<Add />}
                  disabled={disabled}
                >
                  新規作成
                </Button>
              </Tooltip>
            )}
          </Stack>
        )}

        {/* フィルター表示 */}
        {clients.some((c) => !c.isActive) && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Tooltip title="非アクティブな取引先も表示">
              <Chip
                size="small"
                icon={<FilterList fontSize="small" />}
                label="非アクティブも表示"
                variant={showInactiveLocal ? "filled" : "outlined"}
                onClick={() => setShowInactiveLocal(!showInactiveLocal)}
                clickable
                disabled={disabled}
              />
            </Tooltip>
          </Stack>
        )}

        {/* メイン選択コンポーネント */}
        <Autocomplete
          multiple
          value={selectedClients}
          onChange={handleChange}
          options={processedClients}
          loading={loading}
          disabled={disabled || readOnly}
          getOptionLabel={getClientDisplayName}
          groupBy={groupBy !== "none" ? getOptionGroupLabel : undefined}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderOption={renderOption}
          renderTags={renderTags}
          renderInput={(params) => (
            <TextField
              {...params}
              variant={variant as "outlined" | "filled" | "standard"}
              placeholder={selectedClients.length > 0 ? "" : placeholder}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loading && <CircularProgress color="inherit" size={20} />}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          PaperComponent={(props) => (
            <Paper {...props}>
              {props.children}
              {/* フッター情報 */}
              {processedClients.length > 0 && (
                <>
                  <Divider />
                  <Box p={1}>
                    <Typography variant="caption" color="text.secondary">
                      {selectedClients.length} / {processedClients.length}{" "}
                      件選択中
                      {maxSelections && ` (最大 ${maxSelections} 件)`}
                    </Typography>
                  </Box>
                </>
              )}
            </Paper>
          )}
          ChipProps={{
            size: size as "small" | "medium",
          }}
          size={size as "small" | "medium"}
          fullWidth={fullWidth}
          disableCloseOnSelect
          limitTags={5}
          noOptionsText={
            loading
              ? "読み込み中..."
              : searchTerm
                ? "該当する取引先が見つかりません"
                : "取引先がありません"
          }
        />

        {/* ヘルパーテキストとエラー */}
        {(helperText || maxSelections) && (
          <FormHelperText>
            {helperText}
            {maxSelections && (
              <>
                {helperText && " "}
                (最大 {maxSelections} 件まで選択可能)
              </>
            )}
          </FormHelperText>
        )}

        {/* 選択制限警告 */}
        {maxSelections && selectedClients.length >= maxSelections && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            選択可能な上限数に達しています ({maxSelections} 件)
          </Alert>
        )}
      </Box>
    </FormControl>
  );
};

// ========== シンプル版コンポーネント ==========

export interface SimpleClientMultiSelectProps {
  value: string[];
  onChange: (clientIds: string[]) => void;
  clients: Client[];
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
}

export const SimpleClientMultiSelect: React.FC<
  SimpleClientMultiSelectProps
> = ({
  value,
  onChange,
  clients,
  label = "取引先",
  placeholder = "取引先を選択",
  required = false,
  disabled = false,
  error = false,
  helperText,
}) => {
  const selectedClients = clients.filter((client) => value.includes(client.id));

  return (
    <Autocomplete
      multiple
      value={selectedClients}
      onChange={(_, newValue) => onChange(newValue.map((c) => c.id))}
      options={clients.filter((c) => c.isActive)}
      getOptionLabel={(option) => option.name}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          error={error}
          helperText={helperText}
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
      disableCloseOnSelect
      size="small"
    />
  );
};
