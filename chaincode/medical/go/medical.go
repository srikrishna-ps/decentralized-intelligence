package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SmartContract provides functions for managing medical data
type SmartContract struct {
	contractapi.Contract
}

// Patient struct represents a patient record
type Patient struct {
	ID              string            `json:"id"`
	PersonalInfo    map[string]string `json:"personalInfo"`
	MedicalRecords  []MedicalRecord   `json:"medicalRecords"`
	ConsentRecords  []Consent         `json:"consentRecords"`
	AccessControls  []AccessControl   `json:"accessControls"`
}

// MedicalRecord struct represents a medical record
type MedicalRecord struct {
	ID          string            `json:"id"`
	PatientID   string            `json:"patientId"`
	Type        string            `json:"type"`
	Data        map[string]string `json:"data"`
	Timestamp   string            `json:"timestamp"`
	HospitalID  string            `json:"hospitalId"`
}

// Consent struct represents a consent record
type Consent struct {
	ID              string   `json:"id"`
	PatientID       string   `json:"patientId"`
	GrantedTo       string   `json:"grantedTo"`
	RecordTypes     []string `json:"recordTypes"`
	ValidFrom       string   `json:"validFrom"`
	ValidUntil      string   `json:"validUntil"`
}

// AccessControl struct represents an access control record
type AccessControl struct {
	ID              string   `json:"id"`
	PatientID       string   `json:"patientId"`
	EntityID        string   `json:"entityId"`
	Permissions     []string `json:"permissions"`
}

// InitLedger adds a base set of patients to the ledger
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	return nil
}

// CreatePatient adds a new patient to the ledger
func (s *SmartContract) CreatePatient(ctx contractapi.TransactionContextInterface, id string, personalInfo string) error {
	exists, err := s.PatientExists(ctx, id)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("the patient %s already exists", id)
	}

	var info map[string]string
	err = json.Unmarshal([]byte(personalInfo), &info)
	if err != nil {
		return err
	}

	patient := Patient{
		ID:              id,
		PersonalInfo:    info,
		MedicalRecords:  make([]MedicalRecord, 0),
		ConsentRecords:  make([]Consent, 0),
		AccessControls:  make([]AccessControl, 0),
	}

	patientJSON, err := json.Marshal(patient)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, patientJSON)
}

// AddMedicalRecord adds a new medical record for a patient
func (s *SmartContract) AddMedicalRecord(ctx contractapi.TransactionContextInterface, patientID string, recordID string, recordType string, data string, timestamp string, hospitalID string) error {
	patient, err := s.GetPatient(ctx, patientID)
	if err != nil {
		return err
	}

	var recordData map[string]string
	err = json.Unmarshal([]byte(data), &recordData)
	if err != nil {
		return err
	}

	record := MedicalRecord{
		ID:          recordID,
		PatientID:   patientID,
		Type:        recordType,
		Data:        recordData,
		Timestamp:   timestamp,
		HospitalID:  hospitalID,
	}

	patient.MedicalRecords = append(patient.MedicalRecords, record)

	patientJSON, err := json.Marshal(patient)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(patientID, patientJSON)
}

// GetPatient returns the patient stored in the world state with given id
func (s *SmartContract) GetPatient(ctx contractapi.TransactionContextInterface, id string) (*Patient, error) {
	patientJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if patientJSON == nil {
		return nil, fmt.Errorf("the patient %s does not exist", id)
	}

	var patient Patient
	err = json.Unmarshal(patientJSON, &patient)
	if err != nil {
		return nil, err
	}

	return &patient, nil
}

// PatientExists returns true when patient with given ID exists in world state
func (s *SmartContract) PatientExists(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
	patientJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}

	return patientJSON != nil, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&SmartContract{})
	if err != nil {
		fmt.Printf("Error creating medical chaincode: %v", err)
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting medical chaincode: %v", err)
	}
}
