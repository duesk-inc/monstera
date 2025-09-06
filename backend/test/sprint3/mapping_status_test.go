package sprint3_test

import (
    "testing"
    "github.com/duesk/monstera/internal/model"
    "github.com/duesk/monstera/internal/service/mapping"
    "github.com/stretchr/testify/assert"
)

func TestStatusMapping_FEtoBE(t *testing.T) {
    be, err := mapping.MapFEToBEStatus("draft")
    assert.NoError(t, err)
    assert.Equal(t, model.ProjectStatusProposal, be)

    be, err = mapping.MapFEToBEStatus("active")
    assert.NoError(t, err)
    assert.Equal(t, model.ProjectStatusActive, be)

    be, err = mapping.MapFEToBEStatus("archived")
    assert.NoError(t, err)
    assert.Equal(t, model.ProjectStatusClosed, be)
}

func TestStatusMapping_BEtoFE(t *testing.T) {
    fe := mapping.MapBEToFEStatus(model.ProjectStatusProposal)
    assert.Equal(t, "draft", fe)
    fe = mapping.MapBEToFEStatus(model.ProjectStatusActive)
    assert.Equal(t, "active", fe)
    fe = mapping.MapBEToFEStatus(model.ProjectStatusClosed)
    assert.Equal(t, "archived", fe)
}

