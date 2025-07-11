package main

import (
	"database/sql"
	"fmt"
	"log"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
	_ "github.com/lib/pq"
)

// ZeroDateMigrator handles zero date conversion during MySQL to PostgreSQL migration
type ZeroDateMigrator struct {
	mysqlDB    *sql.DB
	postgresDB *sql.DB
	config     MigrationConfig
}

// MigrationConfig contains configuration for zero date handling
type MigrationConfig struct {
	// ConversionStrategy: "null" or "sentinel"
	ConversionStrategy string
	// SentinelDate: date to use if ConversionStrategy is "sentinel"
	SentinelDate string
	// Tables to check for zero dates
	Tables []TableConfig
}

// TableConfig specifies which columns to check in a table
type TableConfig struct {
	TableName   string
	DateColumns []string
}

// ZeroDateReport contains the results of zero date detection
type ZeroDateReport struct {
	TableName     string
	ColumnName    string
	ZeroDateCount int
	TotalRows     int
}

// DetectZeroDates scans MySQL database for zero date values
func (m *ZeroDateMigrator) DetectZeroDates() ([]ZeroDateReport, error) {
	var reports []ZeroDateReport

	for _, table := range m.config.Tables {
		for _, column := range table.DateColumns {
			report, err := m.checkColumnForZeroDates(table.TableName, column)
			if err != nil {
				log.Printf("Error checking %s.%s: %v", table.TableName, column, err)
				continue
			}
			if report.ZeroDateCount > 0 {
				reports = append(reports, report)
			}
		}
	}

	return reports, nil
}

// checkColumnForZeroDates checks a specific column for zero dates
func (m *ZeroDateMigrator) checkColumnForZeroDates(tableName, columnName string) (ZeroDateReport, error) {
	report := ZeroDateReport{
		TableName:  tableName,
		ColumnName: columnName,
	}

	// Count total rows
	totalQuery := fmt.Sprintf("SELECT COUNT(*) FROM %s", tableName)
	err := m.mysqlDB.QueryRow(totalQuery).Scan(&report.TotalRows)
	if err != nil {
		return report, err
	}

	// Count zero dates
	zeroDateQuery := fmt.Sprintf(
		"SELECT COUNT(*) FROM %s WHERE %s = '0000-00-00' OR %s = '0000-00-00 00:00:00'",
		tableName, columnName, columnName,
	)
	err = m.mysqlDB.QueryRow(zeroDateQuery).Scan(&report.ZeroDateCount)
	if err != nil {
		return report, err
	}

	return report, nil
}

// ConvertZeroDates converts zero dates based on the configured strategy
func (m *ZeroDateMigrator) ConvertZeroDates(report ZeroDateReport) error {
	var updateQuery string

	switch m.config.ConversionStrategy {
	case "null":
		updateQuery = fmt.Sprintf(
			"UPDATE %s SET %s = NULL WHERE %s = '0000-00-00' OR %s = '0000-00-00 00:00:00'",
			report.TableName, report.ColumnName, report.ColumnName, report.ColumnName,
		)
	case "sentinel":
		updateQuery = fmt.Sprintf(
			"UPDATE %s SET %s = '%s' WHERE %s = '0000-00-00' OR %s = '0000-00-00 00:00:00'",
			report.TableName, report.ColumnName, m.config.SentinelDate,
			report.ColumnName, report.ColumnName,
		)
	default:
		return fmt.Errorf("invalid conversion strategy: %s", m.config.ConversionStrategy)
	}

	_, err := m.mysqlDB.Exec(updateQuery)
	if err != nil {
		return fmt.Errorf("failed to convert zero dates: %w", err)
	}

	log.Printf("Converted %d zero dates in %s.%s to %s",
		report.ZeroDateCount, report.TableName, report.ColumnName,
		m.config.ConversionStrategy)

	return nil
}

// ValidateConversion checks that no zero dates remain after conversion
func (m *ZeroDateMigrator) ValidateConversion() error {
	reports, err := m.DetectZeroDates()
	if err != nil {
		return fmt.Errorf("validation failed: %w", err)
	}

	if len(reports) > 0 {
		var issues []string
		for _, report := range reports {
			issues = append(issues, fmt.Sprintf("%s.%s: %d zero dates remaining",
				report.TableName, report.ColumnName, report.ZeroDateCount))
		}
		return fmt.Errorf("validation failed, zero dates still exist:\n%s",
			strings.Join(issues, "\n"))
	}

	log.Println("Validation passed: no zero dates found")
	return nil
}

// GenerateReport creates a detailed report of zero date findings
func (m *ZeroDateMigrator) GenerateReport(reports []ZeroDateReport) string {
	var sb strings.Builder

	sb.WriteString("# Zero Date Migration Report\n\n")
	sb.WriteString(fmt.Sprintf("Generated: %s\n\n", time.Now().Format(time.RFC3339)))

	if len(reports) == 0 {
		sb.WriteString("No zero dates found in the database.\n")
		return sb.String()
	}

	sb.WriteString("## Summary\n\n")
	totalZeroDates := 0
	for _, report := range reports {
		totalZeroDates += report.ZeroDateCount
	}
	sb.WriteString(fmt.Sprintf("- Total zero dates found: %d\n", totalZeroDates))
	sb.WriteString(fmt.Sprintf("- Affected tables: %d\n", len(reports)))
	sb.WriteString(fmt.Sprintf("- Conversion strategy: %s\n\n", m.config.ConversionStrategy))

	sb.WriteString("## Details\n\n")
	sb.WriteString("| Table | Column | Zero Dates | Total Rows | Percentage |\n")
	sb.WriteString("|-------|--------|------------|------------|------------|\n")

	for _, report := range reports {
		percentage := float64(report.ZeroDateCount) / float64(report.TotalRows) * 100
		sb.WriteString(fmt.Sprintf("| %s | %s | %d | %d | %.2f%% |\n",
			report.TableName, report.ColumnName, report.ZeroDateCount,
			report.TotalRows, percentage))
	}

	sb.WriteString("\n## Recommended Actions\n\n")
	sb.WriteString("1. Review the affected data to ensure the conversion strategy is appropriate\n")
	sb.WriteString("2. Create a backup before running the conversion\n")
	sb.WriteString("3. Test the conversion on a staging environment first\n")
	sb.WriteString("4. Verify application behavior after conversion\n")

	return sb.String()
}

// Example usage
func main() {
	// This is an example implementation
	// Actual connection strings and table configurations should come from environment/config

	mysqlDB, err := sql.Open("mysql", "user:password@tcp(localhost:3306)/monstera?parseTime=true")
	if err != nil {
		log.Fatal(err)
	}
	defer mysqlDB.Close()

	postgresDB, err := sql.Open("postgres", "postgres://user:password@localhost:5432/monstera?sslmode=disable")
	if err != nil {
		log.Fatal(err)
	}
	defer postgresDB.Close()

	migrator := &ZeroDateMigrator{
		mysqlDB:    mysqlDB,
		postgresDB: postgresDB,
		config: MigrationConfig{
			ConversionStrategy: "null", // or "sentinel"
			SentinelDate:       "1900-01-01",
			Tables: []TableConfig{
				{
					TableName:   "users",
					DateColumns: []string{"birthdate", "last_follow_up_date"},
				},
				{
					TableName:   "weekly_reports",
					DateColumns: []string{"start_date", "end_date", "submitted_at"},
				},
				{
					TableName:   "projects",
					DateColumns: []string{"start_date", "end_date"},
				},
				// Add more tables as needed
			},
		},
	}

	// Step 1: Detect zero dates
	reports, err := migrator.DetectZeroDates()
	if err != nil {
		log.Fatal(err)
	}

	// Step 2: Generate report
	reportContent := migrator.GenerateReport(reports)
	fmt.Println(reportContent)

	// Step 3: Convert zero dates (if any found)
	if len(reports) > 0 {
		fmt.Println("\nConverting zero dates...")
		for _, report := range reports {
			if err := migrator.ConvertZeroDates(report); err != nil {
				log.Printf("Error converting %s.%s: %v",
					report.TableName, report.ColumnName, err)
			}
		}

		// Step 4: Validate conversion
		if err := migrator.ValidateConversion(); err != nil {
			log.Fatal(err)
		}
	}
}
