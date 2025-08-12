package model

import (
	"testing"
)

func TestSalesTeamRoleConstants(t *testing.T) {
	tests := []struct {
		name     string
		role     SalesTeamRole
		expected string
		isValid  bool
	}{
		{
			name:     "Manager role",
			role:     SalesTeamRoleManager,
			expected: "manager",
			isValid:  true,
		},
		{
			name:     "Member role",
			role:     SalesTeamRoleMember,
			expected: "member",
			isValid:  true,
		},
		{
			name:     "Leader role",
			role:     SalesTeamRoleLeader,
			expected: "leader",
			isValid:  true,
		},
		{
			name:     "Invalid role",
			role:     SalesTeamRole("invalid"),
			expected: "invalid",
			isValid:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Test String() method
			if got := tt.role.String(); got != tt.expected {
				t.Errorf("String() = %v, want %v", got, tt.expected)
			}

			// Test IsValid() method
			if got := tt.role.IsValid(); got != tt.isValid {
				t.Errorf("IsValid() = %v, want %v", got, tt.isValid)
			}
		})
	}
}

func TestSalesTeamRoleUsageInHandler(t *testing.T) {
	// This test validates that the constants can be used in switch statements
	// as they are in the handler
	role := SalesTeamRoleManager

	switch role.String() {
	case SalesTeamRoleManager.String():
		// Expected case
	case SalesTeamRoleMember.String():
		t.Error("Should not match member role")
	default:
		t.Error("Should have matched manager role")
	}
}
